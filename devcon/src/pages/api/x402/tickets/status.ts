/**
 * x402 Tickets Status API - Check order status
 * GET /api/x402/tickets/status?paymentReference=xxx
 *
 * Returns the current status of an order
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getPendingOrder,
  getCompletedOrder,
} from 'services/ticketStore'
import { TICKETING } from 'config/ticketing'

function getTicketUrl(orderCode: string): string {
  const baseUrl = TICKETING.pretix.baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
  return `${baseUrl}/${TICKETING.pretix.organizer}/${TICKETING.pretix.event}/order/${orderCode}/`
}

interface StatusResponse {
  success: true
  status: 'pending' | 'completed' | 'expired' | 'not_found'
  order?: {
    code?: string
    email?: string
    total?: string
    ticketUrl?: string
    expiresAt?: number
  }
  payment?: {
    txHash?: string
    payer?: string
    completedAt?: number
  }
}

interface ErrorResponse {
  success: false
  error: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { paymentReference } = req.query

  if (!paymentReference || typeof paymentReference !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'paymentReference query parameter is required',
    })
  }

  try {
    // Check completed orders first
    const completed = await getCompletedOrder(paymentReference)
    if (completed) {
      return res.status(200).json({
        success: true,
        status: 'completed',
        order: {
          code: completed.pretixOrderCode,
          ticketUrl: getTicketUrl(completed.pretixOrderCode),
        },
        payment: {
          txHash: completed.txHash,
          payer: completed.payer,
          completedAt: completed.completedAt,
        },
      })
    }

    // Check pending orders
    const pending = await getPendingOrder(paymentReference)
    if (pending) {
      return res.status(200).json({
        success: true,
        status: 'pending',
        order: {
          total: pending.totalUsd,
          expiresAt: pending.expiresAt,
        },
      })
    }

    return res.status(200).json({
      success: true,
      status: 'not_found',
    })
  } catch (error) {
    console.error('Error checking status:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
}
