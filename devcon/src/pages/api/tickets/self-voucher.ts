import type { NextApiRequest, NextApiResponse } from 'next'
import { getClientIp } from '../../../utils/getClientIp'
import { checkVoucherEmailRateLimit } from '../../../services/discountStore'

// Read from the same globalThis stores that redeem-self writes to
const g = globalThis as unknown as {
  __selfVoucherStore?: Map<string, string>
  __selfErrorStore?: Map<string, string>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const userId = req.query.userId as string
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  // M15: rate-limit per IP. Voucher codes are bearer secrets, and the
  // polling key (`userId`) used to be a free-text query param with no
  // throttle — anyone who learned an `assigned_to` value (from logs,
  // network capture, or a Supabase leak) could hammer this endpoint.
  // Reuse `checkVoucherEmailRateLimit` (10/min/IP) — it's a generic
  // per-IP+per-key bucket on the existing Supabase counter table.
  const clientIp = getClientIp(req)
  const { allowed } = await checkVoucherEmailRateLimit(clientIp, `selfvoucher:${userId}`)
  if (!allowed) {
    return res.status(429).json({ pending: true })
  }

  // M15: the in-memory polling store is keyed by the FE-generated UUID v4
  // (`verifiedUserId` in redeem-self), which has ~122 bits of entropy and is
  // only known to the originating FE session. The dropped Supabase fallback
  // (which queried `assigned_to == userId`) was the actual oracle: an
  // attacker with any `assigned_to` value (Self nullifier, email, etc.)
  // could pull the voucher code without authentication. The fallback is
  // gone; if the in-memory store is cold (server restart), the buyer must
  // re-verify rather than risk an unauth Supabase lookup.
  const voucherCode = g.__selfVoucherStore?.get(userId)
  if (voucherCode) {
    return res.status(200).json({ voucherCode })
  }

  const errorReason = g.__selfErrorStore?.get(userId)
  if (errorReason) {
    return res.status(200).json({ error: true, reason: errorReason })
  }

  // M15: constant 'pending' shape — caller can't distinguish "no such userId"
  // from "verification still in progress" from "rate-limited". Same response
  // as the 429 above, by design.
  return res.status(200).json({ pending: true })
}
