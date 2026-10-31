/**
 * Rules shared by the AV page (/av/) and its API routes, mirroring the nightly
 * AV pipeline in devcon-api (src/scripts/av-assets.ts, src/utils/av-drive.ts,
 * src/utils/run-of-show.ts) so a file made here drops into the crew's Drive
 * folders next to the pipeline's own (its name, plus kind and resolution).
 *
 * Client-safe: no server-only imports.
 */
import slugify from 'slugify'

export const AV_EVENT_ID = 'devcon8'
export const AV_TIMEZONE = 'Asia/Kolkata'

/**
 * Stage screens (LED walls) per room id, at their native resolution. A copy of
 * AV_SCREEN_SIZES in devcon-api/src/utils/av-drive.ts: keep the two in step.
 * Rooms not listed have no known screen and get no Screen Card.
 */
export const AV_SCREEN_SIZES: Record<string, string[]> = {
  'main-stage-lotus': ['4032x1512', '3192x1512'], // the three Lotus walls together
  'lotus-stage-1': ['3192x1512'],
  'lotus-stage-2': ['4032x1512'],
  'lotus-stage-3': ['3192x1512'],
  'jasmine-stage-4': ['1680x1008'],
  'community-led-stage': ['2016x1176'],
  'cls-builders-room': ['2016x1176'], // same pavilion as the Community Led Stage
  'lightning-stage': ['1920x1080'],
  'workshop-1': ['1920x1080'],
  'workshop-2': ['1920x1080'],
}

export const AV_SCREEN_SIZE_SET = new Set(Object.values(AV_SCREEN_SIZES).flat())

/** Room ids are the slugified Pretalx names, as devcon-api's sync makes them. */
export function avRoomId(roomName: string): string {
  return slugify(roomName, { lower: true, strict: true, trim: true })
}

export function screenSizesFor(roomName: string | null | undefined): string[] {
  return roomName ? AV_SCREEN_SIZES[avRoomId(roomName)] ?? [] : []
}

/** Pretalx session codes; anything else is rejected before reaching Pretalx. */
export function isSessionCode(code: unknown): code is string {
  return typeof code === 'string' && /^[A-Za-z0-9]{4,12}$/.test(code)
}

// ---- file names, as the nightly job writes them to Drive ----

const safe = (s: string) =>
  s
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

function shortTitle(t: string): string {
  const s = safe(t)
  if (s.length <= 70) return s
  const cut = s.slice(0, 70)
  return (cut.includes(' ') ? cut.slice(0, cut.lastIndexOf(' ')) : cut) + '…'
}

/** "HH.mm" of the slot start in event time, or "" without a slot. */
function startStamp(start: string | null | undefined): string {
  if (!start) return ''
  const hm = new Intl.DateTimeFormat('en-GB', {
    timeZone: AV_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(start))
  return hm.replace(':', '.')
}

/**
 * `HH.mm <Title> [CODE] - YouTube 1920x1080.jpg`, `... - Screen 3192x1512.jpg`,
 * `... - Social 1200x630.jpg` (`Social Time` with the slot) or `... - Story 1080x1920.jpg`: the nightly job's name
 * plus what the file is and its resolution, so cards downloaded side by side never
 * share a name.
 */
export function cardFileName(
  session: { code: string; title: string; start?: string | null },
  kind: 'YouTube' | 'Screen' | 'Social' | 'Social Time' | 'Story',
  width: number,
  height: number
): string {
  const stamp = startStamp(session.start)
  return `${stamp ? stamp + ' ' : ''}${shortTitle(session.title)} [${session.code}] - ${kind} ${width}x${height}.jpg`
}

/** Content-Disposition naming the file, inline so the page can preview it too. */
export function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'")
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

// ---- slides, as the run of show labels them ----

export type Presenting = 'laptop' | 'deck'

/** The answer to "How will you present?", matched by keyword so a reworded option keeps working. */
export function presentingFromAnswer(answer: string | null | undefined): Presenting | null {
  const text = (answer || '').trim()
  if (!text) return null
  return /laptop/i.test(text) ? 'laptop' : 'deck'
}

/** The run of show's SLIDES cell: own laptop when the speaker said so, else the deck (flagged when never edited). */
export function slidesLabel(presenting: Presenting | null, untouched: boolean): string {
  if (presenting === 'laptop') return 'Own laptop'
  return untouched ? 'Slides (untouched)' : 'Slides'
}
