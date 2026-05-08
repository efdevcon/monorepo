/**
 * Order Status API - Check Pretix order payment status
 * GET /api/x402/tickets/order-status?code=XXXXX&secret=YYYYY
 *
 * Used to poll for fiat (Stripe) payment completion.
 * Requires order secret for authentication.
 * Returns the order status: 'n' (pending), 'p' (paid), 'e' (expired), 'c' (canceled)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
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

  // Fix 18 (M3 sibling): symmetric 404 for both "no such order" and "wrong
  // secret", with constant-time secret compare. Pre-fix code returned 403
  // (real code, wrong secret) vs 500 (missing) — same enumeration oracle
  // shape as the order-details endpoint had before Fix 9.
  const ORDER_NOT_FOUND_RESPONSE = { success: false as const, error: 'Order not found or secret mismatch' }

  let order: Awaited<ReturnType<typeof getOrder>>
  try {
    order = await getOrder(code)
  } catch (error) {
    const msg = (error as Error).message || ''
    if (/Pretix API error 404/.test(msg)) {
      return res.status(404).json(ORDER_NOT_FOUND_RESPONSE)
    }
    console.error('Error fetching order status:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch order status' })
  }

  const expected = Buffer.from(order.secret || '', 'utf-8')
  const provided = Buffer.from(secret, 'utf-8')
  const secretOk = expected.length === provided.length && crypto.timingSafeEqual(expected, provided)
  if (!secretOk) {
    return res.status(404).json(ORDER_NOT_FOUND_RESPONSE)
  }

  return res.status(200).json({
    success: true,
    status: order.status,
    code: order.code,
    secret: order.secret,
  })
}
