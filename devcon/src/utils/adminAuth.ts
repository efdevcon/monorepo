// Shared admin-secret check for `/api/x402/admin/*` endpoints.
//
// Two hardenings vs. the previous inline `provided !== ADMIN_SECRET`:
//
// 1. **Header-only.** The previous code accepted the secret in the
//    `?secret=…` query param as a fallback. Secrets in URLs leak everywhere
//    that URLs land — Nginx access logs, browser history, the `Referer`
//    header on outgoing links, CDN caches, error-tracking breadcrumbs.
//    Now `x-admin-key` only.
//
// 2. **Constant-time compare.** A naive `===` short-circuits on the first
//    differing byte, so the per-byte timing leak (in principle) lets an
//    attacker recover the secret one character at a time. `timingSafeEqual`
//    is the standard mitigation.
import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

const ADMIN_SECRET = process.env.X402_ADMIN_SECRET || ''

/**
 * Validates the admin secret from `x-admin-key`. Sends the appropriate 4xx/5xx
 * response and returns `false` on failure; returns `true` when the caller
 * should proceed.
 */
export function checkAdminAuth(req: NextApiRequest, res: NextApiResponse): boolean {
  if (!ADMIN_SECRET) {
    res.status(500).json({ success: false, error: 'X402_ADMIN_SECRET not configured' })
    return false
  }
  const provided = req.headers['x-admin-key']
  const providedStr = Array.isArray(provided) ? provided[0] : provided
  if (!providedStr) {
    res.status(401).json({ success: false, error: 'unauthorized' })
    return false
  }
  const a = Buffer.from(providedStr, 'utf-8')
  const b = Buffer.from(ADMIN_SECRET, 'utf-8')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ success: false, error: 'unauthorized' })
    return false
  }
  return true
}
