import type { NextApiRequest, NextApiResponse } from 'next'
import { validateDiscountCode, checkDiscountRateLimit } from '../../../services/discountStore'
import { getClientIp } from '../../../utils/getClientIp'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { code } = req.body as { code?: string }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ valid: false, error: 'Missing early access code' })
  }

  try {
    const clientIp = getClientIp(req)
    const { allowed } = await checkDiscountRateLimit(clientIp)
    if (!allowed) {
      return res.status(429).json({ valid: false, error: 'Too many requests. Please try again later.' })
    }

    // M17: use the unclaimed-only validator. `lookupDiscountCode` returned a
    // hit for codes that were already claimed (claimed_by IS NOT NULL),
    // letting an attacker enumerate which codes had been issued. The
    // `validateDiscountCode` helper additionally requires the row's claim
    // state to be unclaimed, so the response no longer distinguishes
    // "doesn't exist" from "exists, already claimed".
    const result = await validateDiscountCode(code)
    if (!result) {
      return res.status(200).json({ valid: false, error: 'Invalid early access code' })
    }

    return res.status(200).json({ valid: true })
  } catch (error) {
    console.error('[validate-early-access] Error:', error)
    return res.status(500).json({ valid: false, error: 'Internal server error' })
  }
}
