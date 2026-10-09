import { eventDays, type EventDay } from './community-hubs'

/**
 * AI-readable session catalogue: one markdown line per session, so a chat
 * assistant (ChatGPT, Claude, a self-hosted model) can read a day's programme
 * through a URL fetch and build an attendee's schedule. The event app's
 * "Plan with your AI" card points assistants at the index (GET /events/:id/ai)
 * and applies the codes they hand back (/my-interests?add=A,B&remove=C).
 * Pure functions, fed by the controller with the store's sessions and the
 * Community Hubs bundle.
 */
export interface CatalogueSession {
  /** What the assistant hands back: the Pretalx code for the main programme, the sheet id for a hub row. */
  code: string
  title: string
  /** UTC ms. */
  start: number
  end: number
  room: string
  track: string
  type: string
  expertise: string
  speakers: string[]
  tags: string[]
  description: string
}

export interface CatalogueFilters {
  day?: number
  track?: string
  type?: string
  room?: string
  q?: string
  ids?: string[]
  /** Full descriptions instead of a one-line summary. */
  full?: boolean
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SUMMARY_CHARS = 180

/** Wall-clock parts of a UTC instant at a fixed offset (the venue's, no DST at Devcon's venues). */
export function localParts(ms: number, offsetMinutes: number) {
  const d = new Date(ms + offsetMinutes * 60_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    key: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
    label: `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
  }
}

export const dayKey = (day: EventDay) => `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`

export function dayLabel(day: EventDay): string {
  const d = new Date(Date.UTC(day.year, day.month - 1, day.day))
  return `${WEEKDAYS[d.getUTCDay()]} ${day.day} ${MONTHS[day.month - 1]} ${day.year}`
}

export function offsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+'
  const abs = Math.abs(offsetMinutes)
  return `UTC${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
}

/** Which event day a session falls on (1-based), by the venue's calendar date; undefined outside the event days. */
export function dayNumberOf(session: CatalogueSession, days: EventDay[], offsetMinutes: number): number | undefined {
  const key = localParts(session.start, offsetMinutes).key
  return days.find((d) => dayKey(d) === key)?.number
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const includes = (hay: string, needle: string) => norm(hay).includes(norm(needle))

export function filterCatalogue(
  sessions: CatalogueSession[],
  filters: CatalogueFilters,
  days: EventDay[],
  offsetMinutes: number,
): CatalogueSession[] {
  let out = sessions
  if (filters.ids?.length) {
    const wanted = new Set(filters.ids.map((c) => c.toLowerCase()))
    out = out.filter((s) => wanted.has(s.code.toLowerCase()))
  }
  if (filters.day !== undefined) out = out.filter((s) => dayNumberOf(s, days, offsetMinutes) === filters.day)
  if (filters.track) out = out.filter((s) => includes(s.track, filters.track!))
  if (filters.type) out = out.filter((s) => includes(s.type, filters.type!))
  if (filters.room) out = out.filter((s) => includes(s.room, filters.room!))
  if (filters.q) {
    const q = filters.q
    out = out.filter(
      (s) =>
        includes(s.title, q) ||
        includes(s.description, q) ||
        s.speakers.some((name) => includes(name, q)) ||
        s.tags.some((tag) => includes(tag, q)) ||
        includes(s.track, q),
    )
  }
  return [...out].sort((a, b) => a.start - b.start || a.room.localeCompare(b.room) || a.title.localeCompare(b.title))
}

function summary(text: string, full: boolean): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (full || flat.length <= SUMMARY_CHARS) return flat
  const cut = flat.slice(0, SUMMARY_CHARS)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 120))}…`
}

/** One session, one line. The code comes first so an assistant can quote it back. */
export function sessionLine(s: CatalogueSession, offsetMinutes: number, full = false): string {
  const from = localParts(s.start, offsetMinutes)
  const to = localParts(s.end, offsetMinutes)
  const parts = [s.code, `${from.time}-${to.time}`, s.room, s.type, s.track]
  if (s.expertise) parts.push(`level: ${s.expertise}`)
  parts.push(`"${s.title}"`)
  if (s.speakers.length) parts.push(`with ${s.speakers.join(', ')}`)
  if (s.tags.length) parts.push(`tags: ${s.tags.join(', ')}`)
  const text = summary(s.description, full)
  if (text) parts.push(full ? `\n  ${text}` : text)
  return `- ${parts.join(' · ')}`
}

export interface CatalogueContext {
  eventId: string
  eventTitle: string
  days: EventDay[]
  offsetMinutes: number
  /** Base URL of this API, for the links in the index. */
  apiOrigin: string
  /** The event app's origin, for the apply link. */
  appOrigin: string
}

/** A day (or filtered) list as markdown, grouped by event day. */
export function formatSessionList(sessions: CatalogueSession[], filters: CatalogueFilters, ctx: CatalogueContext): string {
  const rows = filterCatalogue(sessions, filters, ctx.days, ctx.offsetMinutes)
  const lines: string[] = [
    `# ${ctx.eventTitle}: sessions${filters.day !== undefined ? `, day ${filters.day}` : ''}`,
    `Times are the venue's (${offsetLabel(ctx.offsetMinutes)}). Each line: CODE · time · room · format · track · level · "title" · speakers · tags · summary. Quote the CODE to refer to a session.`,
    '',
  ]
  if (rows.length === 0) {
    lines.push('No sessions match.')
    return lines.join('\n')
  }
  let currentKey = ''
  for (const s of rows) {
    const key = localParts(s.start, ctx.offsetMinutes).key
    if (key !== currentKey) {
      currentKey = key
      const day = ctx.days.find((d) => dayKey(d) === key)
      lines.push(`## ${day ? `Day ${day.number}, ${dayLabel(day)}` : localParts(s.start, ctx.offsetMinutes).label}`)
    }
    lines.push(sessionLine(s, ctx.offsetMinutes, filters.full))
  }
  lines.push('', `${rows.length} sessions.`)
  return lines.join('\n')
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))

/**
 * Catalogue URLs. One path per page (index, each day, all days) so CDNs that
 * key by path alone (Netlify, in front of the event app's mirror) cache each
 * variant on its own; only the filtered search carries a query string. The
 * event app mirrors the same shape under `<app>/ai/<event>` and swaps the base.
 */
export const catalogueUrls = (base: string) => ({
  index: base,
  day: (n: number) => `${base}/day/${n}`,
  all: `${base}/sessions`,
  search: `${base}/search`,
})

/** The entry page an assistant reads first: what the data is, where each day lives, how to query, how to hand sessions back. */
export function formatIndex(sessions: CatalogueSession[], hubs: { id: string; name: string }[], ctx: CatalogueContext): string {
  const urls = catalogueUrls(`${ctx.apiOrigin}/events/${ctx.eventId}/ai`)
  const lines: string[] = [
    `# ${ctx.eventTitle} programme, for AI assistants`,
    '',
    `All times are the venue's local time (${offsetLabel(ctx.offsetMinutes)}). The programme has ${sessions.length} sessions: the main stages plus the Community Hubs, community-run spaces with their own sessions.`,
    '',
    '## Session lists (one line per session, the CODE first)',
  ]
  for (const day of ctx.days) {
    const count = sessions.filter((s) => dayNumberOf(s, ctx.days, ctx.offsetMinutes) === day.number).length
    lines.push(`- Day ${day.number}, ${dayLabel(day)} (${count} sessions): ${urls.day(day.number)}`)
  }
  lines.push(
    `- All days in one page (${sessions.length} sessions, large; use it only if your tool reads long pages in full): ${urls.all}`,
    '',
    '## Narrow a list',
    `${urls.search}?q=<word in title, description, speaker or tag>&day=<n>&track=<word>&type=<word>&room=<word> (any combination). Full details for specific sessions: ${urls.search}?ids=CODE1,CODE2&full=1`,
    '',
    `Tracks: ${unique(sessions.map((s) => s.track)).join('; ')}`,
    `Formats: ${unique(sessions.map((s) => s.type)).join('; ')}`,
    `Levels: ${unique(sessions.map((s) => s.expertise)).join('; ')}`,
    `Rooms: ${unique(sessions.map((s) => s.room)).join('; ')}`,
  )
  if (hubs.length) lines.push(`Community Hubs (filter with &room=<hub name>): ${hubs.map((h) => h.name).join('; ')}`)
  lines.push(
    '',
    '## Handing a plan back',
    `Only use CODEs that appear in these lists. To put sessions into the attendee's "My Interests" in the Devcon app, give them this link (they tap it and confirm): ${ctx.appOrigin}/my-interests?add=CODE1,CODE2&remove=CODE3 (add: sessions to star, remove: starred sessions to drop; either part may be empty). Also list the codes as plain text in case the link cannot be opened.`,
  )
  return lines.join('\n')
}

/** Event days for the catalogue from the event record's date range. */
export const catalogueDays = (startDate: string, endDate: string): EventDay[] => eventDays(startDate, endDate)
