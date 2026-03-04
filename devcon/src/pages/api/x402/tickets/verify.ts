/**
 * x402 Tickets Verify API - Verify payment and complete order
 * POST /api/x402/tickets/verify
 *
 * Request body:
 * {
 *   txHash: string,        // Transaction hash of USDC transfer
 *   paymentReference: string,  // Payment reference from purchase response
 *   payer: string          // Ethereum address that made payment
 * }
 *
 * Returns:
 * - Order confirmation with Pretix order code
 * - Ticket details
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyPayment, verifyPaymentDirect, verifyPaymentNativeEth, getPaymentRecipient, usdToUsdcAmount, encodeSettlementResponseHeader } from 'services/x402'
import { getUsdcConfig } from 'services/relayer'
import type { SettleResponse } from 'types/x402'
import { createOrder, confirmOrderPayment } from 'services/pretix'
import {
  getPendingOrder,
  storePendingOrder,
  getCompletedOrder,
  getCompletedOrderByTxHash,
  checkAndRecordVerifyAttempt,
  claimPendingOrder,
  reserveCompletedOrder,
  finalizeCompletedOrder,
  removeCompletedOrderReservation,
  TxHashAlreadyUsedError,
} from 'services/ticketStore'
import { X402PaymentProof } from 'types/x402'
import { isValidTxHash, validateAddressEIP55, addressesEqual } from 'utils/x402Validation'
import { TICKETING } from 'config/ticketing'

function getTicketUrl(orderCode: string, secret?: string): string {
  const baseUrl = TICKETING.pretix.baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
  if (secret) {
    return `${baseUrl}/${TICKETING.pretix.organizer}/${TICKETING.pretix.event}/order/${orderCode}/${secret}/`
  }
  return `${baseUrl}/${TICKETING.pretix.organizer}/${TICKETING.pretix.event}/order/${orderCode}/`
}

interface VerifyRequest {
  txHash: string
  paymentReference: string
  payer: string
  /** Chain ID where the transaction was sent (e.g. 8453 for Base). Required for multi-chain so we look up the tx on the correct chain. */
  chainId?: number
  /** Payment asset symbol ('ETH' | 'USDC' | 'USDT0'). When 'ETH', we may try native ETH verification. */
  symbol?: string
  /** Token contract address. Required for multi-token chains (e.g. USDC vs USDT0 on Arbitrum). Falls back to USDC if omitted. */
  tokenAddress?: string
}

interface VerifySuccessResponse {
  success: true
  order: {
    code: string
    secret: string
    email: string
    total: string
    status: string
    ticketUrl: string
  }
  payment: {
    txHash: string
    payer: string
    confirmedAt: number
    blockNumber: number
  }
}

interface ErrorResponse {
  success: false
  error: string
  details?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifySuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const body = req.body as VerifyRequest

    // Validate request
    if (!body.txHash || typeof body.txHash !== 'string') {
      return res.status(400).json({ success: false, error: 'Transaction hash is required' })
    }

    if (!body.paymentReference || typeof body.paymentReference !== 'string') {
      return res.status(400).json({ success: false, error: 'Payment reference is required' })
    }

    if (!body.payer || typeof body.payer !== 'string') {
      return res.status(400).json({ success: false, error: 'Payer address is required' })
    }

    if (!isValidTxHash(body.txHash)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash format',
        details: 'Must be 0x followed by 64 hexadecimal characters',
      })
    }

    const payerValidation = validateAddressEIP55(body.payer)
    if (!payerValidation.valid) {
      return res.status(400).json({
        success: false,
        error: payerValidation.error,
      })
    }

    // One-time use of txHash: reject if this transaction already completed an order
    const existingByTx = await getCompletedOrderByTxHash(body.txHash)
    if (existingByTx) {
      return res.status(400).json({
        success: false,
        error: 'This transaction has already been used to complete an order',
        details: 'Each payment can only complete one order',
      })
    }

    // Rate limit
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
    const { allowed } = await checkAndRecordVerifyAttempt(body.paymentReference, clientIp)
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many verify attempts',
        details: 'Please try again later',
      })
    }

    // Check if already completed
    const existingCompleted = await getCompletedOrder(body.paymentReference)
    if (existingCompleted) {
      // Return existing order info
      return res.status(200).json({
        success: true,
        order: {
          code: existingCompleted.pretixOrderCode,
          secret: '',
          email: '', // Don't expose email in duplicate requests
          total: '',
          status: 'paid',
          ticketUrl: getTicketUrl(existingCompleted.pretixOrderCode),
        },
        payment: {
          txHash: existingCompleted.txHash,
          payer: existingCompleted.payer,
          confirmedAt: existingCompleted.completedAt,
          blockNumber: 0,
        },
      })
    }

    // Get pending order
    console.log('[Verify] Looking up pending order for:', body.paymentReference)
    const pendingOrder = await getPendingOrder(body.paymentReference)
    if (!pendingOrder) {
      console.log('[Verify] Pending order not found in ticketStore')
      return res.status(404).json({
        success: false,
        error: 'Payment reference not found or expired',
        details: 'Please create a new purchase request',
      })
    }
    console.log('[Verify] Found pending order:', {
      totalUsd: pendingOrder.totalUsd,
      expiresAt: pendingOrder.expiresAt
    })

    // Intended payer must match (prevents tx reuse attack)
    if (!pendingOrder.intendedPayer || !addressesEqual(pendingOrder.intendedPayer, body.payer)) {
      return res.status(403).json({
        success: false,
        error: 'Payer address does not match the wallet that created this order',
        details: 'Only the wallet used at purchase can verify this payment',
      })
    }

    // Validate chain ID matches what was recorded at purchase (prevents cross-chain tx reuse)
    if (pendingOrder.expectedChainId != null && body.chainId != null && body.chainId !== pendingOrder.expectedChainId) {
      return res.status(400).json({
        success: false,
        error: 'Chain ID does not match the expected chain for this order',
        details: `Expected chain ${pendingOrder.expectedChainId}, got ${body.chainId}`,
      })
    }

    // Verify payment on-chain
    const expectedAmount = usdToUsdcAmount(pendingOrder.totalUsd)
    const paymentProof: X402PaymentProof = {
      txHash: body.txHash,
      paymentReference: body.paymentReference,
      payer: body.payer,
      expectedAmount,
      ...(body.chainId != null && { chainId: body.chainId }),
      ...(body.tokenAddress && { tokenAddress: body.tokenAddress }),
    }

    console.log('[Verify] Attempting primary verification via x402 service', body.chainId != null ? `(chain ${body.chainId})` : '')
    let verification = await verifyPayment(paymentProof)

    // Only try native ETH when client indicates ETH payment; otherwise we'd wrongly run it for USDC and fail (from/to mismatch)
    if (
      !verification.verified &&
      body.symbol === 'ETH' &&
      body.chainId != null &&
      (verification.error === 'No matching transfer found in transaction' || verification.error === 'Invalid payment reference')
    ) {
      const expectedAmountWei = pendingOrder.expectedEthAmountWeiByChain?.[String(body.chainId)]
      if (!expectedAmountWei) {
        return res.status(400).json({
          success: false,
          error: 'Cannot verify native ETH payment',
          details: 'Expected ETH amount for this chain was not recorded at order creation. Please try again or use USDC.',
        })
      }
      const recipient = getPaymentRecipient()
      console.log('[Verify] Trying native ETH verification (chain', body.chainId + ', expected wei from DB)')
      verification = await verifyPaymentNativeEth(
        body.txHash,
        body.payer,
        recipient,
        expectedAmountWei,
        body.chainId
      )
    }

    // If x402 service doesn't have the payment reference, try direct verification (USDC)
    // using the ticket store data (for recovery from hot reloads)
    if (!verification.verified && verification.error === 'Invalid payment reference') {
      console.log('[Verify] x402 payment ref not found, trying direct verification with ticketStore data')
      const expectedAmount = usdToUsdcAmount(pendingOrder.totalUsd)
      const recipient = getPaymentRecipient()
      console.log('[Verify] Direct verification params:', {
        expectedAmount,
        recipient,
        payer: body.payer
      })

      verification = await verifyPaymentDirect(
        body.txHash,
        body.payer,
        recipient,
        expectedAmount,
        body.chainId,
        body.tokenAddress
      )
      console.log('[Verify] Direct verification result:', verification)
    }

    if (!verification.verified) {
      console.log('[Verify] Payment verification failed:', verification.error)
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        details: verification.error,
      })
    }
    console.log('[Verify] Payment verified successfully')

    // Atomically claim the pending order so only one request can create a Pretix order (prevents race)
    const claimedOrder = await claimPendingOrder(body.paymentReference)
    if (!claimedOrder) {
      return res.status(409).json({
        success: false,
        error: 'Order already completed or in progress',
        details: 'Another request may have completed this order. Check status or try again in a moment.',
      })
    }

    // Resolve token symbol and crypto amount before reserving
    const tokenSymbol = body.symbol || getUsdcConfig().tokenSymbol
    let cryptoAmount: string
    if (body.symbol === 'ETH') {
      const expectedWei = pendingOrder.expectedEthAmountWeiByChain?.[String(body.chainId)] || '0'
      cryptoAmount = String(Number(BigInt(expectedWei)) / 1e18)
    } else {
      cryptoAmount = claimedOrder.totalUsd
    }

    // Reserve tx_hash BEFORE creating Pretix order (prevents orphaned tickets on double-spend race)
    try {
      await reserveCompletedOrder(
        body.txHash,
        body.paymentReference,
        body.payer,
        verification.confirmedAt || Math.floor(Date.now() / 1000),
        body.chainId,
        claimedOrder.totalUsd,
        tokenSymbol,
        cryptoAmount,
        undefined // gas paid by user, not sponsored
      )
    } catch (error) {
      if (error instanceof TxHashAlreadyUsedError) {
        // Restore pending order so the user can retry with a different tx
        await storePendingOrder(claimedOrder)
        return res.status(409).json({
          success: false,
          error: 'This transaction has already been used to complete an order',
          details: 'Each payment can only complete one order',
        })
      }
      throw error
    }

    // Attach crypto payment details to order (visible in Pretix admin via x402_crypto plugin)
    const verifyChainIdNum = body.chainId || getUsdcConfig().chainId
    const tokenAddress = body.symbol === 'ETH' ? null : (body.tokenAddress || getUsdcConfig().tokenAddress)
    claimedOrder.orderData.payment_info = {
      tx_hash: body.txHash,
      chain_id: verifyChainIdNum,
      token_symbol: tokenSymbol,
      ...(tokenAddress && { token_address: tokenAddress }),
      amount: `${cryptoAmount} ${tokenSymbol} ($${claimedOrder.totalUsd})`,
      payer: body.payer,
      payment_reference: body.paymentReference,
      block_number: verification.blockNumber || null,
    }

    // Create order in Pretix with x402_crypto payment provider
    console.log('[Verify] Creating Pretix order for payment ref:', body.paymentReference)
    let pretixOrder
    try {
      pretixOrder = await createOrder(claimedOrder.orderData)
      console.log('[Verify] Pretix order created:', pretixOrder.code)
    } catch (error) {
      console.error('[Verify] Failed to create Pretix order:', error)
      // Remove reservation and restore pending order so user can retry
      await removeCompletedOrderReservation(body.paymentReference)
      await storePendingOrder(claimedOrder)
      return res.status(500).json({
        success: false,
        error: 'Failed to create ticket order',
        details: (error as Error).message,
      })
    }

    // Confirm the x402_crypto payment with tx details (instead of mark_paid which creates a new manual payment)
    try {
      const x402Payment = pretixOrder.payments.find((p: any) => p.provider === 'x402_crypto' && p.state !== 'canceled')
      if (x402Payment) {
        console.log('[Verify] Confirming x402_crypto payment:', x402Payment.local_id)
        await confirmOrderPayment(pretixOrder.code, x402Payment.local_id, claimedOrder.orderData.payment_info)
        console.log('[Verify] Payment confirmed with tx details')
      } else {
        console.warn(`[Verify] No x402_crypto payment found on order ${pretixOrder.code}`)
      }
    } catch (error) {
      console.error('[Verify] Failed to confirm payment:', error)
      // Order was created but payment not confirmed - log for manual resolution
      // Continue anyway as the order exists
    }

    // Finalize: replace placeholder with real Pretix order code
    await finalizeCompletedOrder(body.paymentReference, pretixOrder.code)

    // Set PAYMENT-RESPONSE header (x402 v2 spec)
    const usdcConf = getUsdcConfig()
    const verifyChainId = body.chainId || usdcConf.chainId
    const settlementResponse: SettleResponse = {
      success: true,
      transaction: body.txHash,
      network: `eip155:${verifyChainId}` as `${string}:${string}`,
      payer: body.payer,
    }
    res.setHeader('PAYMENT-RESPONSE', encodeSettlementResponseHeader(settlementResponse))

    // Return success response
    const response: VerifySuccessResponse = {
      success: true,
      order: {
        code: pretixOrder.code,
        secret: pretixOrder.secret,
        email: pretixOrder.email,
        total: pretixOrder.total,
        status: 'paid',
        ticketUrl: getTicketUrl(pretixOrder.code, pretixOrder.secret),
      },
      payment: {
        txHash: body.txHash,
        payer: body.payer,
        confirmedAt: verification.confirmedAt || Math.floor(Date.now() / 1000),
        blockNumber: verification.blockNumber || 0,
      },
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error verifying payment:', error)
    return res.status(500).json({
      success: false,
      error: 'Verification error',
    })
  }
}
