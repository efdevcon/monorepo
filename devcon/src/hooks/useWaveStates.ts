import { TICKET_WAVES, type TicketWave } from 'config/waves'
import { useNow } from './useNow'
import { useTicketAvailabilityMap, type TicketAvailability } from './useTicketAvailability'

const NO_AVAILABILITY: TicketAvailability = { available: null }

export type WaveStatus = 'live' | 'countdown' | 'closed' | 'tbd'

export interface WaveState {
  wave: TicketWave
  status: WaveStatus
  // Formatted countdown to `upcoming`, only meaningful when status === 'countdown'.
  countdown: string | null
  // Next opening time for this wave (null if none upcoming or wave is tbd).
  upcoming: Date | null
  mounted: boolean
}

const GRACE_WINDOW_MS = 5 * 60_000

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatRemaining(target: Date, now: Date): string {
  const remaining = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
  const days = Math.floor(remaining / 86_400)
  const hours = Math.floor((remaining % 86_400) / 3_600)
  const mins = Math.floor((remaining % 3_600) / 60)
  const secs = remaining % 60
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`
  return `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`
}

/**
 * Classifies a single wave at a given moment.
 *
 * Rules:
 *   - No openTimes configured                          → 'tbd'
 *   - All openTimes in the future                      → 'countdown' (to first)
 *   - At least one openTime in the past, AND a later
 *     wave (by index in TICKET_WAVES) has also opened  → 'closed' (implicitly
 *                                                        superseded by next wave)
 *   - At least one openTime in the past, no later wave
 *     activated, AND Pretix says available OR we're in
 *     the 5-min grace window after that openTime       → 'live'
 *   - Past openings exist but no live state, AND THIS
 *     wave has another upcoming round                  → 'countdown' (to next round)
 *   - Otherwise                                        → 'closed'
 */
function classify(
  wave: TicketWave,
  idx: number,
  allWaves: TicketWave[],
  now: Date,
  availability: TicketAvailability,
): WaveState {
  if (!wave.openTimes || wave.openTimes.length === 0) {
    return { wave, status: 'tbd', countdown: null, upcoming: null, mounted: true }
  }

  const sorted = [...wave.openTimes].sort((a, b) => a.getTime() - b.getTime())
  const upcoming = sorted.find(t => t.getTime() > now.getTime()) ?? null
  const latestPast = [...sorted].reverse().find(t => t.getTime() <= now.getTime()) ?? null

  // Schedule is the primary gate: we never flip a wave to 'live' before its
  // scheduled openTime, even if Pretix has the quota open for sale. Pretix
  // availability is a *refinement* once the wave's window has started —
  // checked further down to decide between live / sold-out / closed.
  if (!latestPast) {
    return {
      wave,
      status: 'countdown',
      countdown: upcoming ? formatRemaining(upcoming, now) : null,
      upcoming,
      mounted: true,
    }
  }

  // Has at least one past openTime. Is a later wave already activated?
  const supersededByNext = allWaves.slice(idx + 1).some(w => (w.openTimes ?? []).some(t => t.getTime() <= now.getTime()))
  if (supersededByNext) {
    return { wave, status: 'closed', countdown: null, upcoming: null, mounted: true }
  }

  // No later wave has activated — this wave owns the "current" slot.
  // Live iff Pretix says inventory available OR we're inside the grace window.
  const withinGrace = now.getTime() - latestPast.getTime() < GRACE_WINDOW_MS
  if (availability.available || withinGrace) {
    return { wave, status: 'live', countdown: null, upcoming, mounted: true }
  }

  // Not live, but another round of this same wave is still upcoming → show
  // a countdown to that next round rather than marking the wave closed.
  if (upcoming) {
    return {
      wave,
      status: 'countdown',
      countdown: formatRemaining(upcoming, now),
      upcoming,
      mounted: true,
    }
  }

  return { wave, status: 'closed', countdown: null, upcoming: null, mounted: true }
}

/**
 * Returns per-wave state for every entry in TICKET_WAVES. Components that need
 * to render all waves (e.g. the General Admission table) iterate this.
 */
export function useWaveStates(): WaveState[] {
  const now = useNow()
  const availabilityMap = useTicketAvailabilityMap()

  if (!now) {
    return TICKET_WAVES.map(w => ({ wave: w, status: 'countdown', countdown: null, upcoming: null, mounted: false }))
  }
  return TICKET_WAVES.map((w, i) =>
    classify(w, i, TICKET_WAVES, now, availabilityMap[w.id] ?? NO_AVAILABILITY),
  )
}

export interface FeaturedWaveResult {
  mounted: boolean
  featured: WaveState | null
}

/**
 * Returns the wave that should be promoted in single-wave displays (banner,
 * hero strip, store card, overview pill). The featured wave is:
 *   1. The currently 'live' wave, if any.
 *   2. Otherwise the next 'countdown' wave by config order.
 *   3. Otherwise null (all waves are 'closed' or 'tbd' with no future opening).
 */
export function useFeaturedWave(): FeaturedWaveResult {
  const states = useWaveStates()

  if (states.length === 0 || !states[0].mounted) {
    return { mounted: false, featured: null }
  }

  const live = states.find(s => s.status === 'live')
  if (live) return { mounted: true, featured: live }

  const countdown = states.find(s => s.status === 'countdown')
  if (countdown) return { mounted: true, featured: countdown }

  return { mounted: true, featured: null }
}

/**
 * Site-wide convenience for CTAs that route to the store. Returns "Get tickets"
 * when a wave is currently on sale and "View tickets" otherwise, so the label
 * reflects what users will actually see when they arrive at /tickets/store.
 */
export function useTicketsCtaLabel(): { label: 'Get tickets' | 'View tickets'; isLive: boolean } {
  const { featured } = useFeaturedWave()
  const isLive = featured?.status === 'live'
  return { label: isLive ? 'Get tickets' : 'View tickets', isLive }
}

// Earliest configured wave opening time across all `TICKET_WAVES`. The first
// time this is in the past, all site-wide "Get tickets" CTAs switch from the
// internal pre-sale teaser (/tickets/store) to the real external storefront.
const FIRST_WAVE_OPEN_MS = (() => {
  const times = TICKET_WAVES.flatMap(w => w.openTimes ?? [])
  if (times.length === 0) return null
  return times.reduce((min, t) => Math.min(min, t.getTime()), Number.POSITIVE_INFINITY)
})()

const INTERNAL_STORE_URL = '/tickets/store'
const EXTERNAL_STORE_URL = 'https://tickets.devcon.org'

/**
 * Returns the URL every "Get tickets" / "View tickets" CTA should point to
 * right now. Before the first wave opens, the site shows its own teaser
 * storefront at `/tickets/store`. From the moment the first wave's openTime
 * is reached, every CTA flips to the real Pretix-backed storefront at
 * `https://tickets.devcon.org`. SSR-safe: returns the internal URL until
 * `useNow()` mounts.
 */
export function useTicketsStoreUrl(): string {
  const now = useNow()
  if (!now || FIRST_WAVE_OPEN_MS == null) return INTERNAL_STORE_URL
  return now.getTime() >= FIRST_WAVE_OPEN_MS ? EXTERNAL_STORE_URL : INTERNAL_STORE_URL
}
