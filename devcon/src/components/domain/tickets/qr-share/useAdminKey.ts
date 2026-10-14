// The ticket-admin password for the QR share pages: same localStorage key and
// the same whoami endpoint as /tickets/admin/, so one login serves both tools
// and the role (admin or read-only) is re-resolved server-side on every load.
import { useCallback, useEffect, useState } from 'react'
import { readStoredPassword, storePassword, clearStoredPassword, TICKETS_ADMIN_PASSWORD_KEY } from 'utils/adminPassword'

export type AdminRole = 'admin' | 'readonly'

async function resolveRole(key: string): Promise<AdminRole | null> {
  try {
    const res = await fetch('/api/x402/admin/whoami/', { headers: { 'x-admin-key': key } })
    if (!res.ok) return null
    const json: { success?: boolean; role?: AdminRole } = await res.json()
    return json.success && json.role ? json.role : null
  } catch {
    return null
  }
}

export function useAdminKey() {
  const [key, setKey] = useState<string | null>(null)
  const [role, setRole] = useState<AdminRole | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const stored = readStoredPassword(TICKETS_ADMIN_PASSWORD_KEY)
    if (!stored) {
      setChecking(false)
      return
    }
    resolveRole(stored).then(r => {
      if (r) {
        setKey(stored)
        setRole(r)
      } else {
        clearStoredPassword(TICKETS_ADMIN_PASSWORD_KEY)
      }
      setChecking(false)
    })
  }, [])

  /** Resolves the role for a password; returns an error message or null on success. */
  const login = useCallback(async (candidate: string): Promise<string | null> => {
    const trimmed = candidate.trim()
    const r = await resolveRole(trimmed)
    if (!r) return 'Invalid password'
    storePassword(TICKETS_ADMIN_PASSWORD_KEY, trimmed)
    setKey(trimmed)
    setRole(r)
    return null
  }, [])

  const logout = useCallback(() => {
    clearStoredPassword(TICKETS_ADMIN_PASSWORD_KEY)
    setKey(null)
    setRole(null)
  }, [])

  return { key, role, checking, login, logout }
}
