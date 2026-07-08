import { useRouter } from 'next/router'
import {
  GLOBAL_LAUNCH_TIME,
  CURRENT_WAVE_ID,
  GA_SALE_STATE,
  GA_COMING_SOON_OPENS_AT,
  GA_COMING_SOON_LABEL,
  GA_CLOSED_LABEL,
  TICKET_WAVES,
  type GaSaleState,
  type TicketWave,
} from 'config/waves'
import { useNow } from './useNow'

export type WaveStatus = 'live' | 'countdown' | 'closed' | 'tbd'

export interface WaveState {
  wave: TicketWave
  status: WaveStatus
  // Formatted countdown to `upcoming`, only meaningful when status === 'countdown'.
  countdown: string | null
  // Next opening time for this wave (null if none upcoming or wave is tbd).
  upcoming: Date | null
  mounted: boolean
  // True when the wave is 'closed' specifically because the GA sale is paused
  // ('coming-soon' or 'closed') rather than superseded/sold out. Signals
  // consumers to show `pausedLabel` and keep the price visible (un-struck),
  // vs the "Sale ended" treatment for retired waves.
  paused?: boolean
  // The label to render in the status slot / tags when `paused` (e.g.
  // "Reopens Aug" for coming-soon, "Sold out" for closed).
  pausedLabel?: string
}

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
 * Classifies a single wave at a given moment, position-relative to the current
 * wave (CURRENT_WAVE_ID → `currentIdx`). No reliance on close/reopen dates or a
 * Pretix availability poll — the current wave's state is the manual GA_SALE_STATE
 * switch. `openTimes` are used only to show a pre-open countdown (e.g. GA
 * counting down to the global launch).
 *
 * Rules (by position vs the current wave):
 *   - idx <  currentIdx  → 'closed' ("Sale ended" — a past round)
 *   - idx === currentIdx → paused (coming-soon/closed) · countdown (future
 *                          openTime not yet reached) · else 'live'
 *   - idx >  currentIdx  → 'countdown' (future openTime) · else 'tbd' (openLabel)
 */
function classify(
  wave: TicketWave,
  idx: number,
  currentIdx: number,
  now: Date,
  pausedLabel: string | null,
  comingSoonAt: Date | null
): WaveState {
  const sorted = wave.openTimes ? [...wave.openTimes].sort((a, b) => a.getTime() - b.getTime()) : []
  const upcoming = sorted.find(t => t.getTime() > now.getTime()) ?? null
  const latestPast = [...sorted].reverse().find(t => t.getTime() <= now.getTime()) ?? null

  // A round earlier than the current wave → superseded → "Sale ended".
  if (idx < currentIdx) {
    return { wave, status: 'closed', countdown: null, upcoming: null, mounted: true }
  }

  if (idx === currentIdx) {
    // 'coming-soon' with a scheduled reopen → count down to it. The strip /
    // hero / banner render "… available in 5d 20h …"; CTA stays hidden.
    if (comingSoonAt != null) {
      return { wave, status: 'countdown', countdown: formatRemaining(comingSoonAt, now), upcoming: comingSoonAt, mounted: true }
    }
    // Paused with a static label: 'closed' ("Reopens Aug") or 'coming-soon'
    // without a date. Row shows `pausedLabel`, CTA hidden, price kept.
    if (pausedLabel != null) {
      return { wave, status: 'closed', countdown: null, upcoming, mounted: true, paused: true, pausedLabel }
    }
    // Open, but a scheduled openTime is still in the future → pre-open countdown
    // (e.g. GA before the global launch). Otherwise live.
    if (upcoming && !latestPast) {
      return { wave, status: 'countdown', countdown: formatRemaining(upcoming, now), upcoming, mounted: true }
    }
    return { wave, status: 'live', countdown: null, upcoming, mounted: true }
  }

  // A round later than the current wave → upcoming. Countdown if it has a
  // future openTime, else 'tbd' (renders its static openLabel, e.g. "Date TBA").
  if (upcoming && !latestPast) {
    return { wave, status: 'countdown', countdown: formatRemaining(upcoming, now), upcoming, mounted: true }
  }
  return { wave, status: 'tbd', countdown: null, upcoming: null, mounted: true }
}

/**
 * Returns per-wave state for every entry in TICKET_WAVES. Components that need
 * to render all waves (e.g. the General Admission table) iterate this.
 */
export function useWaveStates(): WaveState[] {
  const now = useNow()
  const saleState = useGaSaleState()

  if (!now) {
    return TICKET_WAVES.map(w => ({ wave: w, status: 'countdown', countdown: null, upcoming: null, mounted: false }))
  }
  // The current wave is defined by the CURRENT_WAVE_ID pointer; everything else
  // is positioned relative to it (earlier = ended, later = upcoming).
  const currentIdx = TICKET_WAVES.findIndex(w => w.id === CURRENT_WAVE_ID)
  // Resolve the current wave's paused label / coming-soon countdown target from
  // the sale state. Only the current wave receives these.
  let pausedLabel: string | null = null
  let comingSoonAt: Date | null = null
  if (saleState === 'closed') {
    pausedLabel = GA_CLOSED_LABEL
  } else if (saleState === 'coming-soon') {
    if (GA_COMING_SOON_OPENS_AT && GA_COMING_SOON_OPENS_AT.getTime() > now.getTime()) {
      comingSoonAt = GA_COMING_SOON_OPENS_AT
    } else {
      pausedLabel = GA_COMING_SOON_LABEL
    }
  }
  return TICKET_WAVES.map((w, i) =>
    classify(w, i, currentIdx, now, i === currentIdx ? pausedLabel : null, i === currentIdx ? comingSoonAt : null)
  )
}

/**
 * Current General Admission sale state: 'open' | 'coming-soon' | 'closed'.
 * Driven by the single GA_SALE_STATE config switch, with `?mockNow=…` overriding
 * it for previews:
 *   ?mockNow=launch | open    → 'open'
 *   ?mockNow=coming-soon|soon → 'coming-soon'
 *   ?mockNow=closed           → 'closed'
 * (the same params also advance the clock in `useNow`). When paused, the GA
 * row/tags show the state's label and the CTA is hidden across /tickets.
 */
export function useGaSaleState(): GaSaleState {
  const router = useRouter()
  const m = typeof router.query.mockNow === 'string' ? router.query.mockNow.toLowerCase() : null
  if (m === 'closed') return 'closed'
  if (m === 'coming-soon' || m === 'comingsoon' || m === 'soon') return 'coming-soon'
  if (m === 'launch' || m === 'open') return 'open'
  return GA_SALE_STATE
}

export interface LaunchedResult {
  mounted: boolean
  launched: boolean
}

/**
 * True once the global ticket launch moment (GLOBAL_LAUNCH_TIME, 14 July)
 * has passed. Drives the before/during split for surfaces that open at the
 * global launch but aren't a sale wave themselves — e.g. the Community
 * self-claiming discounts (overview card tag, table row CTAs, comparison
 * column status). SSR-safe: `launched` stays false until `useNow` mounts.
 */
export function useIsLaunched(): LaunchedResult {
  const now = useNow()
  if (!now) return { mounted: false, launched: false }
  return { mounted: true, launched: now.getTime() >= GLOBAL_LAUNCH_TIME.getTime() }
}

export interface FeaturedWaveResult {
  mounted: boolean
  featured: WaveState | null
}

/**
 * Returns the wave that should be promoted in single-wave displays (banner,
 * hero strip, store card, overview pill). The featured wave is:
 *   1. The current wave (CURRENT_WAVE_ID) whenever it's the focus — live,
 *      counting down, OR paused (coming-soon/closed). Keeps every surface on GA
 *      instead of falling through to a later "Date TBA" wave (e.g. Final Waves).
 *   2. Otherwise the first 'live' wave, then the first 'countdown' wave.
 *   3. Otherwise null.
 */
export function useFeaturedWave(): FeaturedWaveResult {
  const states = useWaveStates()

  if (states.length === 0 || !states[0].mounted) {
    return { mounted: false, featured: null }
  }

  const current = states.find(s => s.wave.id === CURRENT_WAVE_ID)
  if (current && (current.status === 'live' || current.status === 'countdown' || current.paused)) {
    return { mounted: true, featured: current }
  }

  const live = states.find(s => s.status === 'live')
  if (live) return { mounted: true, featured: live }

  const countdown = states.find(s => s.status === 'countdown')
  if (countdown) return { mounted: true, featured: countdown }

  return { mounted: true, featured: null }
}

/**
 * Site-wide convenience for CTAs that route to the store. Returns "Get tickets"
 * when a wave is currently on sale and "Join the event" otherwise, so the label
 * invites people in even when no wave is active on /tickets/store.
 */
export function useTicketsCtaLabel(): { label: 'Get tickets' | 'Join the event'; isLive: boolean } {
  const { featured } = useFeaturedWave()
  const isLive = featured?.status === 'live'
  return { label: isLive ? 'Get tickets' : 'Join the event', isLive }
}

const INTERNAL_STORE_URL = '/tickets/store'

/**
 * Returns the URL every "Get tickets" / "Join the event" CTA should point to.
 * Always the site's own storefront at `/tickets/store` — buyers land there
 * first (it handles wave gating and availability) rather than being sent
 * straight to the external Pretix shop.
 */
export function useTicketsStoreUrl(): string {
  return INTERNAL_STORE_URL
}
