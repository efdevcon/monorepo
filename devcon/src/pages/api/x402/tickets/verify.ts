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
import { verifyPayment, verifyPaymentDirect, getPaymentRecipient, usdToUsdcAmount } from 'services/x402'
import { createOrder, markOrderPaid } from 'services/pretix'
import {
  getPendingOrder,
  storeCompletedOrder,
  getCompletedOrder,
  CompletedTicketOrder,
} from 'services/ticketStore'
import { X402PaymentProof } from 'types/x402'

// Build ticket URL from env vars
const PRETIX_BASE_URL = process.env.PRETIX_BASE_URL || 'https://ticketh.xyz'
const PRETIX_ORGANIZER = process.env.PRETIX_ORGANIZER || 'devcon'
const PRETIX_EVENT = process.env.PRETIX_EVENT || '7'

function getTicketUrl(orderCode: string, secret?: string): string {
  const baseUrl = PRETIX_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
  if (secret) {
    return `${baseUrl}/${PRETIX_ORGANIZER}/${PRETIX_EVENT}/order/${orderCode}/${secret}/`
  }
  return `${baseUrl}/${PRETIX_ORGANIZER}/${PRETIX_EVENT}/order/${orderCode}/`
}

interface VerifyRequest {
  txHash: string
  paymentReference: string
  payer: string
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

    // Verify payment on-chain
    const paymentProof: X402PaymentProof = {
      txHash: body.txHash,
      paymentReference: body.paymentReference,
      payer: body.payer,
    }

    console.log('[Verify] Attempting primary verification via x402 service')
    let verification = await verifyPayment(paymentProof)

    // If x402 service doesn't have the payment reference, try direct verification
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
        expectedAmount
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

    // Create order in Pretix
    console.log('[Verify] Creating Pretix order for payment ref:', body.paymentReference)
    let pretixOrder
    try {
      pretixOrder = await createOrder(pendingOrder.orderData)
      console.log('[Verify] Pretix order created:', pretixOrder.code)
    } catch (error) {
      console.error('[Verify] Failed to create Pretix order:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create ticket order',
        details: (error as Error).message,
      })
    }

    // Mark order as paid in Pretix
    try {
      console.log('[Verify] Marking order as paid:', pretixOrder.code)
      await markOrderPaid(pretixOrder.code)
      console.log('[Verify] Order marked as paid')
    } catch (error) {
      console.error('[Verify] Failed to mark order as paid:', error)
      // Order was created but not marked paid - log for manual resolution
      // Continue anyway as the order exists
    }

    // Store completed order
    const completedOrder: CompletedTicketOrder = {
      paymentReference: body.paymentReference,
      pretixOrderCode: pretixOrder.code,
      txHash: body.txHash,
      payer: body.payer,
      completedAt: verification.confirmedAt || Math.floor(Date.now() / 1000),
    }
    await storeCompletedOrder(completedOrder)

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
