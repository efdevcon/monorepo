/**
 * The Q&A QR on each stage screen: devcon.org/qr/meerkat/<room id> resolves
 * (NocoDB "QR redirects" row `meerkat`) to /api/meerkat/?mtm_placement=<room id>,
 * which sends the scanner to the event-app page of the session on that stage
 * right now, where the Meerkat Q&A lives. One printed code per stage, valid
 * all week.
 *
 * Which session:
 * 1. The one a Meerkat moderator put live on that stage ("Go live" in Meerkat's
 *    manage panel; one per stage). That is the truth on the day: it follows
 *    delays and overruns. Trusted only around its own slot, so a flag left on
 *    after the session does not hold the stage's QR all day.
 * 2. Otherwise the schedule: the session on stage now; in a changeover the one
 *    that just ended (its Q&A often runs over); before a stage's first session
 *    or after a long break, the next one.
 * 3. Otherwise the app's schedule.
 * Meerkat's own fallback (the next session not yet started) is not used: with
 * nobody pressing Go live it skips the talk on stage.
 */

export const MEERKAT_EVENT = 'devcon8'
/** The event app (docs/app-domain-migration.md). */
export const EVENT_APP_ORIGIN = 'https://app.devcon.org'
const MEERKAT_ORIGIN = 'https://app.meerkat.events'
const SESSIONS_URL = `https://api.devcon.org/sessions?event=${MEERKAT_EVENT}&size=2000&fields=id,sourceId,slot_start,slot_end,slot_roomId`

/** A session that ended this recently still owns the stage's QR (overrunning Q&A, changeover). */
const ENDED_GRACE_MS = 15 * 60 * 1000
/** An upcoming session takes the QR this long before it starts, when nothing just ended. */
const UPCOMING_LEAD_MS = 60 * 60 * 1000
/** Meerkat's live flag counts from this long before its slot until this long after (late starts, long overruns). */
const LIVE_EARLY_MS = 30 * 60 * 1000
const LIVE_LATE_MS = 60 * 60 * 1000

export interface StageSession {
  id: string
  /** Pretalx code: what Meerkat calls the event's uid */
  sourceId: string
  slot_start: number
  slot_end: number
  slot_roomId: string
}

/** What Meerkat answers for a stage (only the fields used here). */
export interface MeerkatStageEvent {
  uid: string
  live: boolean
}

export type StagePick = { session: StageSession; why: 'meerkat live' | 'live' | 'just ended' | 'next' } | null

/** Pure, so the rule can be checked with fixed clocks. */
export function pickSession(sessions: StageSession[], roomId: string, now: number, meerkat: MeerkatStageEvent | null = null): StagePick {
  const here = sessions.filter(s => s.slot_roomId === roomId && s.slot_start && s.slot_end).sort((a, b) => a.slot_start - b.slot_start)
  if (meerkat?.live) {
    const marked = here.find(s => s.sourceId === meerkat.uid)
    if (marked && now >= marked.slot_start - LIVE_EARLY_MS && now < marked.slot_end + LIVE_LATE_MS) {
      return { session: marked, why: 'meerkat live' }
    }
  }
  const live = here.filter(s => s.slot_start <= now && now < s.slot_end)
  // Overlapping slots: the one that started last is the one on stage.
  if (live.length) return { session: live[live.length - 1], why: 'live' }
  const ended = here.filter(s => s.slot_end <= now && now - s.slot_end < ENDED_GRACE_MS)
  if (ended.length) return { session: ended[ended.length - 1], why: 'just ended' }
  const next = here.find(s => s.slot_start > now && s.slot_start - now < UPCOMING_LEAD_MS)
  if (next) return { session: next, why: 'next' }
  return null
}

/** Where to send the scanner, keeping the QR's Matomo parameters for the app's own analytics. */
export function appUrl(pick: StagePick, mtm: URLSearchParams): string {
  const url = new URL(pick ? `/schedule/${encodeURIComponent(pick.session.id)}` : '/schedule', EVENT_APP_ORIGIN)
  for (const [k, v] of mtm) if (k.startsWith('mtm_')) url.searchParams.set(k, v)
  return url.toString()
}

// The schedule changes rarely and every scan on a stage would ask again:
// keep it a minute per instance (the API's own CDN carries the rest).
let cache: { at: number; sessions: StageSession[] } | null = null
const CACHE_MS = 60 * 1000

export async function fetchStageSessions(): Promise<StageSession[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.sessions
  const res = await fetch(SESSIONS_URL, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`api.devcon.org sessions: HTTP ${res.status}`)
  const body = await res.json()
  const sessions: StageSession[] = body?.data?.items ?? []
  cache = { at: Date.now(), sessions }
  return sessions
}

/**
 * Meerkat's live (or next) event for a stage, public endpoint. Null when Meerkat
 * has nothing for the stage (404), is slow or is down: the schedule takes over.
 * Not cached: a moderator's Go live should reach the next scan.
 */
export async function fetchMeerkatLive(roomId: string): Promise<MeerkatStageEvent | null> {
  try {
    const res = await fetch(`${MEERKAT_ORIGIN}/api/v1/events/stage/${encodeURIComponent(roomId)}/live`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return null
    const event = (await res.json())?.data
    return event?.uid ? { uid: String(event.uid), live: event.live === true } : null
  } catch {
    return null
  }
}
