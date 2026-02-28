import type { NextApiRequest, NextApiResponse } from 'next'
import { validateDiscountCode, checkDiscountRateLimit } from '../../../services/discountStore'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { code } = req.body as { code?: string }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ valid: false, error: 'Missing discount code' })
  }

  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
    const { allowed } = await checkDiscountRateLimit(clientIp)
    if (!allowed) {
      return res.status(429).json({ valid: false, error: 'Too many requests. Please try again later.' })
    }

    const result = await validateDiscountCode(code)
    if (!result) {
      return res.status(200).json({ valid: false, error: 'Invalid discount code' })
    }

    return res.status(200).json({ valid: true })
  } catch (error) {
    console.error('[validate-discount-code] Error:', error)
    return res.status(500).json({ valid: false, error: 'Internal server error' })
  }
}
