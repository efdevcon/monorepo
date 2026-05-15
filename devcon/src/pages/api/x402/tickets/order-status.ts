/**
 * Order Status API - Check Pretix order payment status
 * GET /api/x402/tickets/order-status?code=XXXXX&secret=YYYYY
 *
 * Used to poll for fiat (Stripe) payment completion.
 * Requires order secret for authentication.
 * Returns the order status: 'n' (pending), 'p' (paid), 'e' (expired), 'c' (canceled)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getOrder } from 'services/pretix'

interface OrderStatusResponse {
  success: true
  status: string
  code: string
  secret: string
}

interface ErrorResponse {
  success: false
  error: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderStatusResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const code = req.query.code as string
  const secret = req.query.secret as string

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'Order code is required' })
  }

  if (!secret || typeof secret !== 'string') {
    return res.status(400).json({ success: false, error: 'Order secret is required' })
  }

  try {
    const order = await getOrder(code)

    // Verify secret matches before returning any data
    if (order.secret !== secret) {
      return res.status(403).json({ success: false, error: 'Invalid order secret' })
    }

    return res.status(200).json({
      success: true,
      status: order.status,
      code: order.code,
      secret: order.secret,
    })
  } catch (error) {
    console.error('Error fetching order status:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch order status',
    })
  }
}
