import type { NextApiRequest, NextApiResponse } from 'next'
import { getClientIp } from '../../../utils/getClientIp'
import { checkSelfVoucherRateLimit, getSelfDelivery, pruneSelfDeliveries } from '../../../services/discountStore'
import { SERVER_INSTANCE_ID } from '../../../utils/serverInstance'

// Only meaningful outcomes are logged (hits, fallbacks) — never the 3s
// `pending` polls, which would flood the function logs.
const log = (msg: string) => console.log(`[self-voucher][${SERVER_INSTANCE_ID}] ${msg}`)

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
    log(`mem hit code=${voucherCode} userId=${userId}`)
    return res.status(200).json({ voucherCode })
  }

  const errorReason = g.__selfErrorStore?.get(userId)
  if (errorReason) {
    log(`mem error hit userId=${userId}`)
    return res.status(200).json({ error: true, reason: errorReason })
  }

  // Durable fallback. The maps above only help when this poll happens to hit
  // the same warm instance that served Self's verification POST; on a
  // different or cold instance they are empty and the buyer used to sit here
  // until the UI gave up, voucher already assigned (production, 2026-08-28).
  //
  // This lookup is keyed by the FE's per-session UUID v4 (~122 bits), not by
  // `assigned_to`. That is the distinction from the fallback removed in M15:
  // nullifiers and emails are knowable by third parties and made that version
  // an unauthenticated voucher oracle, whereas this key is a secret held by
  // the originating browser session alone.
  const delivered = await getSelfDelivery(userId)
  if (delivered?.voucherCode) {
    // The line that proves the durable handoff earned its keep: this instance's
    // memory was cold, the DB row delivered anyway (cross-instance/cold-start).
    log(`DB fallback hit code=${delivered.voucherCode} userId=${userId} (mem cold)`)
    // Re-warm this instance so the remaining polls in this session are local.
    g.__selfVoucherStore?.set(userId, delivered.voucherCode)
    return res.status(200).json({ voucherCode: delivered.voucherCode })
  }
  if (delivered?.errorReason) {
    log(`DB fallback error hit userId=${userId} (mem cold)`)
    return res.status(200).json({ error: true, reason: delivered.errorReason })
  }

  // Nothing to deliver — cheap moment to drop expired rows (best effort, not
  // awaited, so polling latency is unaffected).
  void pruneSelfDeliveries()

  // M15: constant 'pending' shape — caller can't distinguish "no such userId"
  // from "verification still in progress" from "rate-limited". Same response
  // as the 429 above, by design.
  return res.status(200).json({ pending: true })
}
