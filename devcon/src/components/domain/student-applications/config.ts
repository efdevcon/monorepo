// Admin emails loaded from environment variable (comma-separated)
// e.g. STUDENT_ADMIN_EMAILS=alice@example.com,bob@example.com
function getAdmins(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_STUDENT_ADMIN_EMAILS ?? process.env.STUDENT_ADMIN_EMAILS ?? ''
  return new Set(raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean))
}

export function isAdmin(email: string): boolean {
  return getAdmins().has(email.toLowerCase())
}

export const isVoucherAdmin = isAdmin
export const isReviewerAdmin = isAdmin
