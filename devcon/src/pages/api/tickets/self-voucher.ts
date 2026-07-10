import type { NextApiRequest, NextApiResponse } from 'next'
import { getClientIp } from '../../../utils/getClientIp'
import { checkSelfVoucherRateLimit } from '../../../services/discountStore'

// Read from the same globalThis stores that redeem-self writes to
const g = globalThis as unknown as {
  __selfVoucherStore?: Map<string, string>
  __selfErrorStore?: Map<string, string>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // This endpoint is polled repeatedly at the same URL while a voucher is being
  // assigned. Without no-store the browser caches the first `{pending:true}`
  // response and serves it (via 304 revalidation) for the rest of the polling
  // window, so the voucher — stored server-side after the backend POST — is
  // never observed and the UI reports "Verification timed out".
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const userId = req.query.userId as string
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  // M15: rate-limit per IP. Voucher codes are bearer secrets and `userId` used
  // to be a free-text query param with no throttle. The limit is per-IP DoS
  // protection (the userId is a 122-bit UUID, not enumerable). Use the
  // poll-tuned limiter (60/min/IP) — the email limiter's 3/min per-key cap
  // would block legitimate polling within seconds.
  const clientIp = getClientIp(req)
  const { allowed } = await checkSelfVoucherRateLimit(clientIp)
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
