// Waitlist signup, shared by the terminal and the screen-reader form.
// POSTs JSON to VITE_WAITLIST_ENDPOINT. Until that is set (the backend is not
// decided yet) nothing is sent: every signup comes back as a failure, so the
// terminal shows its "could not join" message instead of a false success.

export type WaitlistResult = { ok: true } | { ok: false; reason: string }

const ENDPOINT: string | undefined = import.meta.env.VITE_WAITLIST_ENDPOINT
const TIMEOUT_MS = 10_000
const JOINED_KEY = 'devcon-ix-joined'

/** Never throws: network errors, non-2xx and timeouts all come back as ok:false. */
export async function submitWaitlist(email: string, source: string): Promise<WaitlistResult> {
  if (!ENDPOINT) return { ok: false, reason: 'no endpoint' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source, ts: new Date().toISOString() }),
      signal: ctrl.signal,
    })
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` }
    try {
      localStorage.setItem(JOINED_KEY, '1')
    } catch {}
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: ctrl.signal.aborted ? 'timeout' : String(e) }
  } finally {
    clearTimeout(timer)
  }
}

/** Whether this browser has signed up before. */
export function hasJoined(): boolean {
  try {
    return localStorage.getItem(JOINED_KEY) === '1'
  } catch {
    return false
  }
}
