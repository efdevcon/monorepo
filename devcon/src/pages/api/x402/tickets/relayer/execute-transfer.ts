/**
 * Execute Transfer API - Execute gas-sponsored USDC transfer
 * POST /api/x402/tickets/relayer/execute-transfer
 *
 * Request body:
 * {
 *   paymentReference: string,  // Payment reference from purchase response
 *   authorization: EIP3009Authorization,  // The authorization details
 *   signature: { v: number, r: string, s: string }  // The signature
 * }
 *
 * The relayer executes the transfer, paying gas from ETH_RELAYER_PAYMENT_PRIVATE_KEY
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getPendingOrder } from 'services/ticketStore'
import { getPaymentRecipient, usdToUsdcAmount, encodeSettlementResponseHeader } from 'services/x402'
import { executeTransferWithAuthorization, executeTransferWithAuthorizationBytes, isSmartWalletSignature } from 'services/relayer'
import { type Hex } from 'viem'
import { ExecuteTransferRequest, ExecuteTransferResponse, type SettleResponse, getGaslessTokenConfig, getGaslessConfigsForChain } from 'types/x402'
import { validateAddressEIP55, addressesEqual } from 'utils/x402Validation'

interface ErrorResponse {
  success: false
  error: string
  details?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExecuteTransferResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const body = req.body as ExecuteTransferRequest

    // Validate request
    if (!body.paymentReference || typeof body.paymentReference !== 'string') {
      return res.status(400).json({ success: false, error: 'Payment reference is required' })
    }

    if (!body.authorization) {
      return res.status(400).json({ success: false, error: 'Authorization is required' })
    }

    // Accept signature as:
    //  1. { v, r, s } object (EOA)
    //  2. rawSignature hex string (smart wallet / ERC-1271)
    //  3. signature as raw hex string (fallback)
    const sig = body.signature
    const sigObj = (sig && typeof sig === 'object') ? sig as { v: number; r: string; s: string } : undefined
    const hasVRS = sigObj && sigObj.v !== undefined && sigObj.r && sigObj.s
    const rawSigStr = body.rawSignature ?? (typeof sig === 'string' ? sig : undefined)
    const hasRawSig = typeof rawSigStr === 'string' && rawSigStr.startsWith('0x') && rawSigStr.length >= 132
    if (!hasVRS && !hasRawSig) {
      return res.status(400).json({ success: false, error: 'Valid signature is required' })
    }

    const fromValidation = validateAddressEIP55(body.authorization.from)
    if (!fromValidation.valid) {
      return res.status(400).json({ success: false, error: fromValidation.error })
    }

    // Get pending order
    console.log('[ExecuteTransfer] Looking up pending order for:', body.paymentReference)
    const pendingOrder = await getPendingOrder(body.paymentReference)
    if (!pendingOrder) {
      return res.status(404).json({
        success: false,
        error: 'Payment reference not found or expired',
        details: 'Please create a new purchase request',
      })
    }

    // Check if order is expired
    if (Date.now() / 1000 > pendingOrder.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference has expired',
        details: 'Please create a new purchase request',
      })
    }

    // Only accept authorization for this order's intended payer (reject if not our payment)
    if (!addressesEqual(body.authorization.from, pendingOrder.intendedPayer)) {
      return res.status(403).json({
        success: false,
        error: 'Authorization from address does not match the wallet that created this order',
        details: 'Only the wallet used at purchase can complete this payment',
      })
    }

    // Validate authorization `to` is the payment recipient
    const paymentRecipient = getPaymentRecipient()
    const expectedAmount = usdToUsdcAmount(pendingOrder.totalUsd)

    if (!addressesEqual(body.authorization.to, paymentRecipient)) {
      return res.status(400).json({
        success: false,
        error: 'Authorization recipient must be the payment recipient address',
        details: `Expected: ${paymentRecipient}, Got: ${body.authorization.to}`,
      })
    }

    if (BigInt(body.authorization.value) < BigInt(expectedAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Authorization amount is less than expected',
        details: `Expected: ${expectedAmount}, Got: ${body.authorization.value}`,
      })
    }

    // Validate authorization is still valid (not expired)
    const now = Math.floor(Date.now() / 1000)
    if (body.authorization.validBefore > 0 && now > body.authorization.validBefore) {
      return res.status(400).json({
        success: false,
        error: 'Authorization has expired',
      })
    }

    if (body.authorization.validAfter > now) {
      return res.status(400).json({
        success: false,
        error: 'Authorization is not yet valid',
      })
    }

    // Validate optional chainId for multi-chain gasless
    const requestedChainId = body.chainId
    if (requestedChainId !== undefined && getGaslessConfigsForChain(requestedChainId).length === 0) {
      return res.status(400).json({
        success: false,
        error: `Unsupported chain for gasless payment: ${requestedChainId}`,
      })
    }

    // Resolve token config (by chainId + tokenAddress, or first config for chain)
    const tokenAddress = (body as any).tokenAddress as string | undefined
    const tokenConfig = requestedChainId !== undefined
      ? (tokenAddress
          ? getGaslessTokenConfig(requestedChainId, tokenAddress)
          : getGaslessConfigsForChain(requestedChainId)[0])
      : getGaslessConfigsForChain(8453)[0] // default to Base USDC
    if (!tokenConfig) {
      return res.status(400).json({
        success: false,
        error: `No gasless token config found for chain ${requestedChainId}${tokenAddress ? ` and token ${tokenAddress}` : ''}`,
      })
    }

    console.log('[ExecuteTransfer] Executing transfer for ref:', body.paymentReference, `(chain ${tokenConfig.chainId}, ${tokenConfig.tokenSymbol})`)

    // Execute the transfer (single tx: user → payment recipient via transferWithAuthorization)
    let result: { txHash: string }
    if (hasRawSig && isSmartWalletSignature(rawSigStr!)) {
      // Smart wallet (ERC-1271): use bytes overload
      console.log('[ExecuteTransfer] Smart wallet signature detected, using bytes overload')
      result = await executeTransferWithAuthorizationBytes(body.authorization, rawSigStr as Hex, tokenConfig)
    } else if (hasRawSig) {
      // EOA raw signature: split into v/r/s
      const hex = rawSigStr!
      const r = hex.slice(0, 66)
      const s = `0x${hex.slice(66, 130)}`
      let v = parseInt(hex.slice(130, 132), 16)
      if (v < 27) v += 27
      result = await executeTransferWithAuthorization(body.authorization, { v, r, s }, tokenConfig)
    } else {
      result = await executeTransferWithAuthorization(body.authorization, body.signature as { v: number; r: string; s: string }, tokenConfig)
    }

    console.log('[ExecuteTransfer] Transaction submitted:', result.txHash)

    // Set PAYMENT-RESPONSE header (x402 v2 spec)
    const settleChainId = tokenConfig.chainId
    const settlementResponse: SettleResponse = {
      success: true,
      transaction: result.txHash,
      network: `eip155:${settleChainId}` as `${string}:${string}`,
      payer: body.authorization.from,
    }
    res.setHeader('PAYMENT-RESPONSE', encodeSettlementResponseHeader(settlementResponse))

    const response: ExecuteTransferResponse = {
      success: true,
      txHash: result.txHash,
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error executing transfer:', error)
    return res.status(500).json({
      success: false,
      error: `Failed to execute transfer: ${(error as Error).message}`,
    })
  }
}
