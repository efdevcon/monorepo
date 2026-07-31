// Client-side storage of the internal-tool passwords (the `x-admin-key` header
// value each page sends).
//
// One key per tool, never shared: the ticket dashboard and builder review are
// separate credentials server-side (utils/adminAuth.ts), so unlocking one must
// not unlock the other.
//
// localStorage, not sessionStorage: closing the browser shouldn't force a
// re-login. `clearStoredPassword` (the Log out button) is the way out.
//
// The password itself decides what it grants. Nothing about the access level is
// cached here — it is re-resolved server-side on every page load, so rotating a
// secret takes effect immediately.
export const TICKETS_ADMIN_PASSWORD_KEY = 'tickets_admin_password'
export const BUILDER_REVIEW_PASSWORD_KEY = 'builder_review_password'

/** The stored password for a tool, or null when nobody has logged in here. */
export function readStoredPassword(storageKey: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(storageKey)
}

/** Persists a password until an explicit log out. */
export function storePassword(storageKey: string, password: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey, password)
}

/** Forgets a stored password. */
export function clearStoredPassword(storageKey: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(storageKey)
}
