// Server-side password gates for the internal admin tools. Every one of them
// reads the same header (`x-admin-key`) but they are separate credentials —
// holding one grants nothing on the others.
//
// Ticket admin dashboard (/tickets/admin → /api/x402/admin/*), two levels:
//
//   TICKETS_ADMIN_PASSWORD     — full access: refunds, manual verification.
//   TICKETS_READONLY_PASSWORD  — read-only: the GET dashboards (orders,
//                                incoming txs, sales stats) and nothing else.
//                                Handed out to people who need visibility
//                                without the ability to move money.
//
// Builder review (/builder-review/[id] → /api/builder/review/*):
//
//   BUILDER_REVIEW_PASSWORD    — approving/rejecting applications, which mints
//                                vouchers and emails applicants. Deliberately
//                                its own password: reviewers have no business
//                                refunding orders, and neither ticket password
//                                opens this door.
//
// Convention (not enforced, so an existing secret can be reused as-is): give
// the values self-describing prefixes — `ADMIN_…` and `READONLY_…` — so whoever
// receives one can tell at a glance what it grants.
//
// Endpoints are admin-only by default; a route opts into the read-only key with
// `checkAdminAuth(req, res, { allowReadonly: true })`. That way a newly added
// route is never accidentally exposed to the weaker secret.
//
// Two hardenings vs. the original inline `provided !== ADMIN_SECRET`:
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

const ADMIN_SECRET = process.env.TICKETS_ADMIN_PASSWORD || ''
const READONLY_SECRET = process.env.TICKETS_READONLY_PASSWORD || ''
const BUILDER_REVIEW_SECRET = process.env.BUILDER_REVIEW_PASSWORD || ''

export type AdminRole = 'admin' | 'readonly'

function secretMatches(provided: string, expected: string): boolean {
  // An unset secret must never match (otherwise an empty env var would turn
  // into an "any empty key works" bypass).
  if (!expected) return false
  const a = Buffer.from(provided, 'utf-8')
  const b = Buffer.from(expected, 'utf-8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Resolves the access level of the `x-admin-key` header, or null when the
 * header is missing / matches neither secret. Admin is checked first, so
 * setting both env vars to the same value degrades to full access rather than
 * read-only.
 */
export function resolveAdminRole(req: NextApiRequest): AdminRole | null {
  const provided = req.headers['x-admin-key']
  const providedStr = Array.isArray(provided) ? provided[0] : provided
  if (!providedStr) return null
  if (secretMatches(providedStr, ADMIN_SECRET)) return 'admin'
  if (secretMatches(providedStr, READONLY_SECRET)) return 'readonly'
  return null
}

/**
 * Validates the admin secret from `x-admin-key`. Sends the appropriate 4xx/5xx
 * response and returns `false` on failure; returns `true` when the caller
 * should proceed.
 *
 * Pass `{ allowReadonly: true }` on endpoints that only read data — those also
 * accept X402_READONLY_SECRET. Everything else stays admin-only and answers a
 * read-only key with 403 (distinct from the 401 for a bad key, so the UI can
 * tell "wrong password" from "not allowed").
 */
export function checkAdminAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  opts: { allowReadonly?: boolean } = {}
): boolean {
  if (!ADMIN_SECRET) {
    res.status(500).json({ success: false, error: 'TICKETS_ADMIN_PASSWORD not configured' })
    return false
  }
  const role = resolveAdminRole(req)
  if (!role) {
    res.status(401).json({ success: false, error: 'unauthorized' })
    return false
  }
  if (role === 'readonly' && !opts.allowReadonly) {
    res.status(403).json({ success: false, error: 'read-only access: this action requires the admin password' })
    return false
  }
  return true
}

/**
 * Gate for the builder-review tools. Same `x-admin-key` header, but only
 * BUILDER_REVIEW_PASSWORD opens it — the ticket admin passwords are a separate
 * credential and do not carry over (and vice versa).
 */
export function checkBuilderReviewAuth(req: NextApiRequest, res: NextApiResponse): boolean {
  if (!BUILDER_REVIEW_SECRET) {
    res.status(500).json({ success: false, error: 'BUILDER_REVIEW_PASSWORD not configured' })
    return false
  }
  const provided = req.headers['x-admin-key']
  const providedStr = Array.isArray(provided) ? provided[0] : provided
  if (!providedStr || !secretMatches(providedStr, BUILDER_REVIEW_SECRET)) {
    res.status(401).json({ success: false, error: 'unauthorized' })
    return false
  }
  return true
}
