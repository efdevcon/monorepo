/**
 * x402 Tickets Status API - Check order status
 * GET /api/x402/tickets/status?paymentReference=xxx
 * GET /api/x402/tickets/status?orderCode=xxx
 *
 * Returns the current status of an order
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getPendingOrder,
  getCompletedOrder,
  getCompletedOrderByPretixCode,
} from 'services/ticketStore'
import { isPaymentReferenceValid } from 'services/x402'

// Build ticket URL from env vars
const PRETIX_BASE_URL = process.env.PRETIX_BASE_URL || 'https://ticketh.xyz'
const PRETIX_ORGANIZER = process.env.PRETIX_ORGANIZER || 'devcon'
const PRETIX_EVENT = process.env.PRETIX_EVENT || '7'

function getTicketUrl(orderCode: string): string {
  const baseUrl = PRETIX_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
  return `${baseUrl}/${PRETIX_ORGANIZER}/${PRETIX_EVENT}/order/${orderCode}/`
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

  const { paymentReference, orderCode } = req.query

  if (!paymentReference && !orderCode) {
    return res.status(400).json({
      success: false,
      error: 'Either paymentReference or orderCode query parameter is required',
    })
  }

  try {
    // Check by payment reference
    if (paymentReference && typeof paymentReference === 'string') {
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
            email: pending.metadata?.email,
            total: pending.totalUsd,
            expiresAt: pending.expiresAt,
          },
        })
      }

      // Check if reference existed but expired
      // Note: In production with a database, we could track this better
      return res.status(200).json({
        success: true,
        status: 'not_found',
      })
    }

    // Check by order code
    if (orderCode && typeof orderCode === 'string') {
      const completed = await getCompletedOrderByPretixCode(orderCode)
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

      return res.status(200).json({
        success: true,
        status: 'not_found',
      })
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid query parameters',
    })
  } catch (error) {
    console.error('Error checking status:', error)
    return res.status(500).json({
      success: false,
      error: `Status check error: ${(error as Error).message}`,
    })
  }
}
