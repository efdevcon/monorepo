/**
 * Devcon 8 sessions for the AV page, read straight from Pretalx so a change
 * made there minutes before a talk shows without waiting for the schedule
 * release, the devcon-api sync or the nightly AV job.
 *
 * The page sits behind the AV crew password, and everything leaving this
 * module is still mapped field by field from public data only: accepted/confirmed sessions (the share page's
 * rule), titles, track, room and time, speaker names, plus the
 * deck link and how the speaker presents. Never emails, notes, reviews or
 * proposals in any other state.
 */
import { isPublicSubmissionState } from 'services/social-cards/submission-state'
import { AV_EVENT_ID, presentingFromAnswer, screenSizesFor, slidesLabel, type Presenting } from './av-assets'

const PRETALX_BASE = process.env.PRETALX_BASE_URL || 'https://cfp.devcon.org/api'

// Devcon 8 questions, as in devcon-api/src/utils/config.ts.
const QUESTION_DECK = 181 // "Slides deck" (written by the slides sync)
const QUESTION_DECK_LAST_EDIT = 183 // "Slides: last edit" ("untouched" while never edited)
const QUESTION_PRESENTING = 188 // "How will you present your talk?"

export interface AvSessionSummary {
  code: string
  title: string
  speakers: string[]
  room: string | null
  start: string | null
  end: string | null
}

export interface AvSessionDetail extends AvSessionSummary {
  track: string
  type: string
  speakerList: AvSpeaker[]
  screenSizes: string[]
  slides: { url: string | null; label: string; presenting: Presenting | null; untouched: boolean }
}

export interface AvSpeaker {
  code: string
  name: string
}

/**
 * Confirmed sessions that run inside another session's slot and have none of
 * their own in Pretalx: the parts of the Opening Ceremony. Listed on its
 * stage and day so AV gets their cards; a real Pretalx slot always wins.
 */
const MAIN_STAGE_ID = 104 // Main Stage (Lotus)
const OPENING_CEREMONY = {
  roomId: MAIN_STAGE_ID,
  room: 'Main Stage (Lotus)',
  start: '2026-11-03T09:30:00+05:30',
  end: '2026-11-03T12:00:00+05:30',
}
const HARDCODED_SLOTS: Record<string, typeof OPENING_CEREMONY> = {
  UQTFKT: OPENING_CEREMONY, // Opening - Welcome
  DALFGB: OPENING_CEREMONY, // Opening - Keynote
  UCBU3V: OPENING_CEREMONY, // Opening - PQ
  QVCWKC: OPENING_CEREMONY, // Opening - Trust
  LZ3EJK: OPENING_CEREMONY, // Opening - Privacy
}

/** Where a session without a Pretalx slot runs, when it is one of HARDCODED_SLOTS. */
export function hardcodedSlot(code: string): { room: string; start: string; end: string } | null {
  const slot = HARDCODED_SLOTS[code.toUpperCase()]
  return slot ? { room: slot.room, start: slot.start, end: slot.end } : null
}

const text = (v: any): string => (typeof v === 'string' ? v : v?.en ?? '') || ''

async function pretalx(pathAndQuery: string): Promise<any> {
  const key = process.env.PRETALX_API_KEY
  if (!key) throw new Error('PRETALX_API_KEY is not set')
  // Absolute URLs are Pretalx's own `next` page links; never send the token anywhere else.
  if (pathAndQuery.startsWith('http') && !pathAndQuery.startsWith(PRETALX_BASE + '/'))
    throw new Error('unexpected Pretalx URL')
  const url = pathAndQuery.startsWith('http') ? pathAndQuery : `${PRETALX_BASE}/events/${AV_EVENT_ID}/${pathAndQuery}`
  const res = await fetch(url, { headers: { Authorization: `Token ${key}` }, signal: AbortSignal.timeout(15_000) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Pretalx answered ${res.status}`)
  return res.json()
}

/** First slot that has a room: the session's place in the schedule Pretalx is editing now. */
function slotOf(raw: any): { room: string | null; start: string | null; end: string | null } {
  const slot = (Array.isArray(raw?.slots) ? raw.slots : []).find((s: any) => s?.room) ?? null
  return { room: slot ? text(slot.room?.name) || null : null, start: slot?.start ?? null, end: slot?.end ?? null }
}

export interface AvStage {
  id: number
  name: string
}

/** The stages in Pretalx order, and the event's days (YYYY-MM-DD, event time). */
export async function getAvStages(): Promise<{ stages: AvStage[]; days: string[] }> {
  const [rooms, event] = await Promise.all([pretalx('rooms/?limit=100'), pretalx('')])
  const stages = (rooms?.results ?? [])
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    .map((r: any) => ({ id: r.id, name: text(r.name) }))
  const days: string[] = []
  if (event?.date_from && event?.date_to) {
    for (
      let d = new Date(`${event.date_from}T00:00:00Z`);
      d <= new Date(`${event.date_to}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1)
    )
      days.push(d.toISOString().slice(0, 10))
  }
  return { stages, days }
}

/**
 * The public sessions on one stage in the schedule Pretalx is editing now
 * (its work-in-progress version, so unreleased moves show), by start time.
 */
export async function listAvStageSessions(roomId: number): Promise<AvSessionSummary[]> {
  const wip = await pretalx('schedules/wip/')
  if (!wip?.id) throw new Error('no work-in-progress schedule')
  const out: AvSessionSummary[] = []
  let page: any = await pretalx(
    `slots/?schedule=${wip.id}&room=${roomId}&limit=100&expand=submission,submission.speakers`
  )
  while (page) {
    for (const slot of page.results ?? []) {
      const sub = slot.submission
      if (!sub?.code || !isPublicSubmissionState(sub.state)) continue
      out.push({
        code: sub.code,
        title: sub.title ?? '',
        speakers: (sub.speakers ?? []).map((sp: any) => sp.name ?? '').filter(Boolean),
        room: null,
        start: slot.start ?? null,
        end: slot.end ?? null,
      })
    }
    page = page.next ? await pretalx(page.next) : null
  }
  const listed = new Set(out.map(s => s.code))
  const extra = Object.keys(HARDCODED_SLOTS).filter(c => HARDCODED_SLOTS[c].roomId === roomId && !listed.has(c))
  const subs = await Promise.all(extra.map(c => pretalx(`submissions/${c}/?expand=speakers`)))
  extra.forEach((code, i) => {
    const sub = subs[i]
    if (!sub || !isPublicSubmissionState(sub.state)) return
    out.push({
      code,
      title: sub.title ?? '',
      speakers: (sub.speakers ?? []).map((sp: any) => sp.name ?? '').filter(Boolean),
      room: null,
      start: HARDCODED_SLOTS[code].start,
      end: HARDCODED_SLOTS[code].end,
    })
  })
  // Stable: hardcoded parts follow the session they share a start time with, in the order above.
  return out.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))
}

/** One public session with what the AV page renders, or null (unknown, or not public). */
export async function getAvSession(code: string): Promise<AvSessionDetail | null> {
  const raw = await pretalx(
    `submissions/${encodeURIComponent(
      code
    )}/?questions=${QUESTION_DECK},${QUESTION_DECK_LAST_EDIT},${QUESTION_PRESENTING}` +
      '&expand=answers.question,speakers,slots,slots.room,track,submission_type'
  )
  if (!raw || !isPublicSubmissionState(raw.state)) return null

  const answer = (id: number): string => {
    const a = (raw.answers ?? []).find(
      (x: any) => (typeof x.question === 'object' ? x.question?.id : x.question) === id
    )
    return typeof a?.answer === 'string' ? a.answer.trim() : ''
  }
  const deck = answer(QUESTION_DECK)
  const presenting = presentingFromAnswer(answer(QUESTION_PRESENTING))
  const untouched = answer(QUESTION_DECK_LAST_EDIT) === 'untouched'
  const slot = slotOf(raw)
  if (!slot.room) Object.assign(slot, hardcodedSlot(raw.code))

  return {
    code: raw.code,
    title: raw.title ?? '',
    track: text(raw.track?.name ?? raw.track),
    type: text(raw.submission_type?.name ?? raw.submission_type),
    ...slot,
    speakers: (raw.speakers ?? []).map((s: any) => s.name ?? '').filter(Boolean),
    speakerList: (raw.speakers ?? []).map((s: any) => ({ code: s.code, name: s.name ?? '' })),
    screenSizes: screenSizesFor(slot.room),
    slides: {
      url: /^https?:\/\//i.test(deck) ? deck : null,
      label: slidesLabel(presenting, untouched),
      presenting,
      untouched,
    },
  }
}

/**
 * The official speaker list: every speaker on a confirmed Devcon 8 session,
 * with the photo the card draws. The AV page's card editor picks from it, and
 * the card routes only accept speakers on it. Kept 5 minutes per server.
 */
const OFFICIAL_TTL_MS = 5 * 60 * 1000
let official: { at: number; speakers: Promise<Map<string, AvSpeaker & { avatar: string }>> } | null = null

export function getOfficialSpeakers(): Promise<Map<string, AvSpeaker & { avatar: string }>> {
  if (official && Date.now() - official.at < OFFICIAL_TTL_MS) return official.speakers
  const speakers = (async () => {
    const out = new Map<string, AvSpeaker & { avatar: string }>()
    let page: any = await pretalx('submissions/?state=confirmed&limit=100&expand=speakers')
    while (page) {
      for (const sub of page.results ?? []) {
        for (const sp of sub.speakers ?? []) {
          if (!sp?.code || out.has(sp.code)) continue
          out.set(sp.code, {
            code: sp.code,
            name: sp.name ?? '',
            // Old uploads still render on the retired hostname; the files live on the current one.
            avatar: String(sp.avatar_url ?? '').replace(/^https?:\/\/speak\.devcon\.org\//, 'https://cfp.devcon.org/'),
          })
        }
      }
      page = page.next ? await pretalx(page.next) : null
    }
    return out
  })()
  official = { at: Date.now(), speakers }
  // A failed fetch is not kept: the next call tries again.
  speakers.catch(() => {
    if (official?.speakers === speakers) official = null
  })
  return speakers
}
