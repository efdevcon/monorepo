import { useEffect, useState } from 'react'

export interface TicketAvailability {
  available: boolean | null // null = not yet loaded
  available_number: number | null
}

// TEMPORARY: short-circuit availability to `false` until the prod Pretix quota
// id is configured. With this set to true, the hook makes no network calls and
// always reports unavailable, so wave UI flips to "live" only via the
// grace-window path (useful for time-only testing). Flip back to `false` and
// re-enable polling once `TICKETING.pretix.defaultQuotaId` is correct.
const ALWAYS_REPORT_UNAVAILABLE = true

/**
 * Polls /api/tickets/availability (Pretix quota proxy) on an interval.
 * Returns the live availability for the default quota.
 *
 * Used by the wave countdown UI to flip between "countdown" and "OPEN"
 * states without waiting for the user to refresh the page.
 */
export function useTicketAvailability(intervalMs: number = 10_000): TicketAvailability {
  const [state, setState] = useState<TicketAvailability>(
    ALWAYS_REPORT_UNAVAILABLE ? { available: false, available_number: null } : { available: null, available_number: null },
  )

  useEffect(() => {
    if (ALWAYS_REPORT_UNAVAILABLE) return

    let cancelled = false

    async function poll() {
      try {
        const res = await fetch('/api/tickets/availability')
        if (!res.ok) return
        const json = await res.json()
        if (cancelled || !json?.data) return
        setState({
          available: !!json.data.available,
          available_number: json.data.available_number ?? null,
        })
      } catch {
        // Swallow — keep showing previous state. The interval will retry.
      }
    }

    poll()
    const id = setInterval(poll, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [intervalMs])

  return state
}
