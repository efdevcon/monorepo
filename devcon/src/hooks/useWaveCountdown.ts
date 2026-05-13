import { useNow } from './useNow'

export interface WaveCountdownState {
  // The next future wave (or null if all waves are in the past).
  upcoming: Date | null
  // The most recent wave that has already opened (or null if none yet).
  latest: Date | null
  // Formatted countdown to `upcoming`, e.g. "2d 4h 12m 38s" or "4h 12m 38s".
  // null on SSR / initial render to avoid hydration mismatches.
  countdown: string | null
  // True for the first 5 minutes after a wave opens — used as a grace window
  // so the UI flips to "live" immediately, even before the next quota poll.
  withinGraceWindow: boolean
  // True once the client-side ticker has started; useful for components that
  // want to defer rendering wave-dependent UI until then.
  mounted: boolean
}

const GRACE_WINDOW_MS = 5 * 60_000

function classify(waves: Date[], now: Date): { latest: Date | null; upcoming: Date | null } {
  let latest: Date | null = null
  let upcoming: Date | null = null
  const sorted = [...waves].sort((a, b) => a.getTime() - b.getTime())
  for (const wave of sorted) {
    if (wave.getTime() <= now.getTime()) latest = wave
    else if (!upcoming) upcoming = wave
  }
  return { latest, upcoming }
}

// Zero-pad to 2 digits so the rendered countdown stays the same width as it
// ticks (e.g. "12s" → "09s" keeps the same horizontal footprint). Combined
// with `tabular-nums` on the rendering element, this prevents adjacent
// elements from shifting on each tick.
function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatRemaining(target: Date, now: Date): string {
  const remaining = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
  const days = Math.floor(remaining / 86_400)
  const hours = Math.floor((remaining % 86_400) / 3_600)
  const mins = Math.floor((remaining % 3_600) / 60)
  const secs = remaining % 60
  // Days stays unpadded (avoids "08d" while we're days out from launch);
  // hours/minutes/seconds stay zero-padded so the digit count is stable as
  // they tick down (combined with CountdownText's width-reservation trick).
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`
  return `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`
}

/**
 * Ticks once per second and returns the countdown to the next future wave,
 * plus whether we're inside the 5-minute "just opened" grace window.
 *
 * Adapted from the SEA-era waves countdown (devcon-7), with `moment` swapped
 * for native Date math.
 */
export function useWaveCountdown(waves: Date[]): WaveCountdownState {
  // Time source — supports URL-based mocking via `?mockNow=<ISO>`.
  // See `hooks/useNow.ts` for the full mocking contract.
  const now = useNow()

  if (!now) {
    return { upcoming: null, latest: null, countdown: null, withinGraceWindow: false, mounted: false }
  }

  const { latest, upcoming } = classify(waves, now)
  const countdown = upcoming ? formatRemaining(upcoming, now) : null
  const withinGraceWindow = !!latest && now.getTime() - latest.getTime() < GRACE_WINDOW_MS

  return { upcoming, latest, countdown, withinGraceWindow, mounted: true }
}
