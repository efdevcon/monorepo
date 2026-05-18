import { useSyncExternalStore } from 'react'

export interface TicketAvailability {
  available: boolean | null // null = not yet loaded
  available_number: number | null
}

export type TicketAvailabilityMap = Record<string, TicketAvailability>

const POLL_INTERVAL_MS = 10_000
const EMPTY: TicketAvailability = { available: null, available_number: null }
const EMPTY_MAP: TicketAvailabilityMap = {}

// ── Singleton store ─────────────────────────────────────────────────────────
// `/api/tickets/availability` is polled at most once every POLL_INTERVAL_MS
// across the entire client. Every hook consumer subscribes to the same map
// and re-renders on the same tick, so a page with 5 surfaces still produces
// 1 request per interval — not 5.

let latestMap: TicketAvailabilityMap = EMPTY_MAP
let subscribers = new Set<() => void>()
let pollTimer: ReturnType<typeof setInterval> | null = null
let inflight = false

async function poll() {
  if (inflight) return
  inflight = true
  try {
    const res = await fetch('/api/tickets/availability')
    if (!res.ok) return
    const json = await res.json()
    const waves = json?.data?.waves
    if (!waves || typeof waves !== 'object') return
    const next: TicketAvailabilityMap = {}
    for (const [waveId, entry] of Object.entries(waves) as Array<[string, TicketAvailability]>) {
      next[waveId] = {
        available: !!entry.available,
        available_number: entry.available_number ?? null,
      }
    }
    latestMap = next
    for (const cb of subscribers) cb()
  } catch {
    // Swallow — the next interval retries.
  } finally {
    inflight = false
  }
}

function startPolling() {
  if (pollTimer) return
  poll()
  pollTimer = setInterval(poll, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb)
  if (subscribers.size === 1) startPolling()
  return () => {
    subscribers.delete(cb)
    if (subscribers.size === 0) stopPolling()
  }
}

function getSnapshot(): TicketAvailabilityMap {
  return latestMap
}

function getServerSnapshot(): TicketAvailabilityMap {
  return EMPTY_MAP
}

/**
 * Returns the live Pretix availability for every configured wave. Backed by
 * a process-wide singleton: regardless of how many components call this hook,
 * only one `setInterval` runs and only one HTTP request fires per tick.
 */
export function useTicketAvailabilityMap(): TicketAvailabilityMap {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Convenience wrapper for surfaces that only care about one wave. Reads from
 * the same singleton — adding more consumers doesn't add more requests.
 */
export function useTicketAvailability(waveId: string): TicketAvailability {
  const map = useTicketAvailabilityMap()
  return map[waveId] ?? EMPTY
}
