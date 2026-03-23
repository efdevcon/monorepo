// Admin emails — same role for voucher import + application review
const ADMINS = new Set([
  'lasse.jacobsen@ethereum.org',
])

export function isAdmin(email: string): boolean {
  return ADMINS.has(email.toLowerCase())
}

// Keep backward-compat aliases used by API routes
export const isVoucherAdmin = isAdmin
export const isReviewerAdmin = isAdmin
