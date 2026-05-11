import { useEffect, useState } from 'react'

export interface TicketAvailability {
  available: boolean | null // null = not yet loaded
  available_number: number | null
}

/**
 * Polls /api/tickets/availability (Pretix quota proxy) on an interval.
 * Returns the live availability for the default quota.
 *
 * Used by the wave countdown UI to flip between "countdown" and "OPEN"
 * states without waiting for the user to refresh the page.
 */
export function useTicketAvailability(intervalMs: number = 10_000): TicketAvailability {
  const [state, setState] = useState<TicketAvailability>({ available: null, available_number: null })

  useEffect(() => {
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
