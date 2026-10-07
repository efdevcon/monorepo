import { defaultSlugify } from '@/utils/content'
import type { DSheet, DSheetCell, DSheetTab } from '@/clients/fileverse'

// Community Hubs publish their programme in a shared dSheets template. v5 is
// one "Schedule" tab holding only what the app reads: the hub name at the top,
// one row per session (ID, Day, From, To, Session title, Format, Speaker(s),
// Description, Topic) and a Topics list beside the schedule that the Topic
// dropdown reads from. The pre-filled ID is the session's identity, so a
// retitled row keeps its saved stars and reminders; Topic rides into the app
// as a tag. Earlier revisions (v4: one tab per day plus Info and Read me tabs,
// no ID/Topic; older: "Day N" banner rows) still parse. This module knows the
// template and turns a sheet into session rows; services/community-hubs.ts
// serves them as the event's Community Hubs bundle.

/** Hub rooms are recognised by this id prefix everywhere (schedule sync, Pretalx sync, app). */
export const COMMUNITY_HUB_ROOM_PREFIX = 'community-hub-'
export const COMMUNITY_HUB_TRACK = 'Community Hubs'
/** Devcon 8 runs on Mumbai time (IST, UTC+5:30, no DST). */
export const COMMUNITY_HUB_UTC_OFFSET_MINUTES = 330
/** Sheet times are wall-clock in the event's city; devcon-7 (Bangkok, UTC+7) exists so test files can target its dataset. */
const EVENT_UTC_OFFSET_MINUTES: Record<string, number> = { 'devcon-7': 420 }
export const eventUtcOffsetMinutes = (eventId: string) => EVENT_UTC_OFFSET_MINUTES[eventId] ?? COMMUNITY_HUB_UTC_OFFSET_MINUTES

export interface CommunityHub {
  /** Short slug, also the key in the COMMUNITY_HUB_SHEETS secret. */
  id: string
  name: string
  /** The hub's pastel colour (badges, cards); served on the hub's room. Same values as the event app's registry. */
  color: string
}

/** The 14 Devcon 8 hubs, official names from the Community Hubs coordinator (2026-10-07), alphabetical. */
export const COMMUNITY_HUBS: CommunityHub[] = [
  { id: 'agentic', name: 'Agentic Hub', color: '#C2FFDD' },
  { id: 'aggregation', name: 'Aggregation Hub', color: '#EDD6FF' },
  { id: 'desci', name: 'DeSci Hub', color: '#D4F7F4' },
  { id: 'eip', name: 'EIP Hub', color: '#D4EBF7' },
  { id: 'india', name: 'India Hub', color: '#FFE7D1' },
  { id: 'legal-governance', name: 'Legal & Governance Hub', color: '#B9EFFF' },
  { id: 'onchain-art', name: 'Onchain Art Hub', color: '#F7D4D4' },
  { id: 'open-source', name: 'Open Source Hub', color: '#DDFDEC' },
  { id: 'p2p-networking', name: 'P2P Networking Hub', color: '#A8FFD5' },
  { id: 'prediction-markets', name: 'Prediction Markets Hub', color: '#F5FFDB' },
  { id: 'privacy', name: 'Privacy Hub', color: '#FFE8E5' },
  { id: 'resilient-networking', name: 'Resilient Networking Hub', color: '#FFF4E0' },
  { id: 'security', name: 'Security Hub', color: '#E9E5FF' },
  { id: 'zuzone', name: 'Zuzone Hub', color: '#DEEDE5' },
]

export const communityHubRoomId = (hubId: string) => `${COMMUNITY_HUB_ROOM_PREFIX}${hubId}`
export const isCommunityHubRoom = (roomId: unknown): boolean => typeof roomId === 'string' && roomId.startsWith(COMMUNITY_HUB_ROOM_PREFIX)

export interface EventDay {
  /** 1-based day number as the template labels it ("Day 1"). */
  number: number
  /** Calendar date in the event timezone. */
  year: number
  month: number
  day: number
}

/** Event days from the event record's startDate/endDate (date-only ISO strings). */
export function eventDays(startDate: string, endDate: string): EventDay[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days: EventDay[] = []
  for (let t = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()), n = 1; t <= end.getTime(); t += 86_400_000, n++) {
    const d = new Date(t)
    days.push({ number: n, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() })
  }
  return days
}

export interface HubSessionRow {
  /** 1-based sheet row, for messages. */
  line: number
  /** Template v5 Key cell, trimmed; '' when the sheet has no Key column or the cell is empty. Drives the session id. */
  key: string
  title: string
  /** Free text; hub sessions carry it as a tag next to the hub's name. '' when absent. */
  topic: string
  description: string
  format: string
  speakers: string[]
  /** UTC ms. */
  start: number
  end: number
  day: EventDay
}

export interface ParsedHubSheet {
  hubName: string | null
  /** False when the template's header row is missing: the sheet could not be read as a schedule at all. */
  headerFound: boolean
  sessions: HubSessionRow[]
  problems: string[]
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const SPEAKER_PLACEHOLDERS = /^(tba|tbd|tbc|n\/?a|none|-|\[?speaker( name)?\]?)$/i
const DAY_BANNER = /^day\s*\d+\b/i

/** Minutes since midnight from a time cell: a fraction of a day, or text like "9:00", "09.30", "9h30", "9 am", "2:30 pm", "1430". */
export function parseClock(value: string | number | boolean | null, text?: string): number | null {
  // Imported time cells can come back as the day fraction in a string ("0.375");
  // three or more decimals tells it apart from a typed "9.30".
  if (typeof value === 'string' && /^0?\.\d{3,}$/.test(value.trim())) value = Number(value)
  if (typeof value === 'number' && Number.isFinite(value)) {
    const fraction = value - Math.floor(value)
    // Excel/Luckysheet store times as fractions of a day; a bare hour (9) is also tolerated.
    if (value >= 0 && value < 24 && Number.isInteger(value)) return value * 60
    return Math.round(fraction * 1440)
  }
  const raw = (typeof value === 'string' && value.trim() ? value : text ?? '').trim().toLowerCase()
  if (!raw) return null
  const match = raw.match(/^(\d{1,2})(?:\s*[:.h]\s*(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/) || raw.match(/^(\d{1,2})(\d{2})()$/)
  if (!match) return null
  let hours = Number(match[1])
  const minutes = Number(match[2] ?? 0)
  const meridiem = match[3]?.replace(/\./g, '')
  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** Which event day a Day cell means: "Day 2 · Wednesday 4 November", "Day 2", "Wednesday", "4 Nov", "Nov 4", "2026-11-04". */
export function parseDay(text: string, days: EventDay[]): EventDay | null {
  const raw = text.trim().toLowerCase()
  if (!raw) return null
  const byNumber = raw.match(/\bday\s*(\d+)\b/)
  if (byNumber) return days.find((d) => d.number === Number(byNumber[1])) ?? null
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return days.find((d) => d.year === Number(iso[1]) && d.month === Number(iso[2]) && d.day === Number(iso[3])) ?? null
  const monthWord = MONTHS.findIndex((m) => new RegExp(`\\b${m}[a-z]*\\b`).test(raw))
  const dayOfMonth = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/)
  if (monthWord >= 0 && dayOfMonth) {
    return days.find((d) => d.month === monthWord + 1 && d.day === Number(dayOfMonth[1])) ?? null
  }
  const weekday = WEEKDAYS.findIndex((w) => new RegExp(`\\b${w}[a-z]*\\b`).test(raw))
  if (weekday >= 0) return days.find((d) => new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay() === weekday) ?? null
  if (dayOfMonth && !/[a-z]/.test(raw)) return days.find((d) => d.day === Number(dayOfMonth[1])) ?? null
  return null
}

/** Speaker names from a free-text cell: "Ada Lovelace, Alan Turing & Grace Hopper". */
export function parseSpeakers(text: string): string[] {
  const names = text
    .split(/[,;\n]|\s+&\s+|\s+and\s+|\s+\+\s+/i)
    .map((s) => s.trim().replace(/^[-•*]\s*/, ''))
    .filter((s) => s && !SPEAKER_PLACEHOLDERS.test(s))
  return [...new Set(names)]
}

/** UTC timestamp for a wall-clock time on an event day (event timezone offset applied). */
export function toUtcMs(day: EventDay, minutesSinceMidnight: number, utcOffsetMinutes = COMMUNITY_HUB_UTC_OFFSET_MINUTES): number {
  return Date.UTC(day.year, day.month - 1, day.day) + (minutesSinceMidnight - utcOffsetMinutes) * 60_000
}

const HEADER_PATTERNS = {
  key: /^(id|key)\b/i,
  // "Topic" is the session column; the "Topics" list the dropdown reads from sits beside the schedule with its own header.
  topic: /^topic(?!s)\b/i,
  day: /^day$/i,
  start: /^(start|from)\b/i,
  end: /^(end|to)\b/i,
  title: /^(session\s*)?title\b|^session\s*name\b|^session$/i,
  format: /^(format|type)\b/i,
  speakers: /^speaker/i,
  description: /^desc/i,
}

type Column = keyof typeof HEADER_PATTERNS

/** Single-tab layout (template v3): "Schedule" when present, else the first tab that is not "Example". */
export function pickScheduleTab(sheet: DSheet): DSheetTab | undefined {
  return sheet.tabs.find((t) => /^schedule$/i.test(t.name.trim())) ?? sheet.tabs.find((t) => !/^example$/i.test(t.name.trim())) ?? sheet.tabs[0]
}

/**
 * Template v4 names a tab per day: "Wed 4" (weekday and date, the month is
 * implied), or the older "Day 2 · Wed 4 Nov". Anything parseDay understands
 * works, and a tab that does not resolve to an event day (Info, Read me, a
 * hub's own extra tabs) is simply not a day tab.
 */
export function dayFromTabName(name: string, days: EventDay[]): EventDay | null {
  const match = name.trim().match(/^day\s*(\d+)\b/i)
  if (match) return days.find((d) => d.number === Number(match[1])) ?? null
  return parseDay(name, days)
}

/**
 * The tabs that hold the programme: every "Day N" tab in day order (v4), else
 * the single schedule tab (v3). Tab position is ignored on purpose: hubs drag
 * today's tab to the front so the embedded sheet opens on it.
 */
export function pickScheduleTabs(sheet: DSheet, days: EventDay[]): { tab: DSheetTab; day: EventDay | null }[] {
  const dayTabs = sheet.tabs
    .map((tab) => ({ tab, day: dayFromTabName(tab.name, days) }))
    .filter((t) => t.day !== null)
    .sort((a, b) => a.day!.number - b.day!.number)
  if (dayTabs.length > 0) return dayTabs
  const single = pickScheduleTab(sheet)
  return single ? [{ tab: single, day: null }] : []
}

/** "Hub name" label with the value to its right, on any tab (v4 keeps it on the Info tab). */
export function findHubName(tabs: DSheetTab[]): string | null {
  for (const tab of tabs) {
    const label = tab.cells.find((c) => /^hub\s*name\b/i.test(c.text))
    if (!label) continue
    const right = tab.cells.filter((c) => c.row === label.row && c.col > label.col && c.text).sort((a, b) => a.col - b.col)[0]
    if (right) return right.text
  }
  return null
}

/**
 * Whole sheet: every day tab parsed with its tab's day as the default, problems
 * prefixed with the tab name, the hub name looked up on any tab. `headerFound`
 * is true when at least one tab could be read as a schedule.
 */
export function parseHubSheets(sheet: DSheet, days: EventDay[], utcOffsetMinutes = COMMUNITY_HUB_UTC_OFFSET_MINUTES): ParsedHubSheet {
  const tabs = pickScheduleTabs(sheet, days)
  const sessions: HubSessionRow[] = []
  const problems: string[] = []
  let headerFound = false
  // A Key must be unique across the whole sheet (it is the session id). The
  // second use falls back to the title scheme and is reported, so the hub can
  // fix it before a rename loses that row's stars.
  const keyOwners = new Map<string, string>()
  for (const { tab, day } of tabs) {
    const parsed = parseHubSheet(tab, days, utcOffsetMinutes, day ?? undefined)
    headerFound = headerFound || parsed.headerFound
    const where = (line: number) => (tabs.length > 1 ? `${tab.name} row ${line}` : `row ${line}`)
    for (const row of parsed.sessions) {
      if (!row.key) continue
      const owner = keyOwners.get(row.key.toLowerCase())
      if (owner) {
        parsed.problems.push(`row ${row.line} "${row.title}": Key "${row.key}" is already used on ${owner}, this row falls back to its title`)
        row.key = ''
      } else {
        keyOwners.set(row.key.toLowerCase(), where(row.line))
      }
    }
    sessions.push(...parsed.sessions)
    problems.push(...parsed.problems.map((p) => (tabs.length > 1 ? `${tab.name}: ${p}` : p)))
  }
  if (tabs.length === 0) problems.push('sheet has no tabs')
  return { hubName: findHubName(sheet.tabs), headerFound, sessions, problems }
}

function findColumns(cells: DSheetCell[], into: Partial<Record<Column, number>>) {
  for (const c of cells) {
    for (const [name, pattern] of Object.entries(HEADER_PATTERNS) as [Column, RegExp][]) {
      if (into[name] === undefined && pattern.test(c.text)) into[name] = c.col
    }
  }
}

/**
 * One tab. Header: the row holding the "Session title" label, plus the row below
 * when the time columns are labelled there ("Time" spanning "from" / "to"). A
 * row's day is, in order: its Day column, the "Day N" banner above it, or
 * `defaultDay` (the tab's own day in the one-tab-per-day layout).
 */
export function parseHubSheet(
  tab: DSheetTab,
  days: EventDay[],
  utcOffsetMinutes = COMMUNITY_HUB_UTC_OFFSET_MINUTES,
  defaultDay?: EventDay
): ParsedHubSheet {
  const problems: string[] = []
  const rows = new Map<number, DSheetCell[]>()
  for (const cell of tab.cells) {
    if (!rows.has(cell.row)) rows.set(cell.row, [])
    rows.get(cell.row)!.push(cell)
  }
  const ordered = [...rows.entries()].sort((a, b) => a[0] - b[0])

  let hubName: string | null = null
  let firstDataRow: number | null = null
  const columns: Partial<Record<Column, number>> = {}
  for (const [index, [, cells]] of ordered.entries()) {
    const label = cells.find((c) => /^hub\s*name\b/i.test(c.text))
    if (label && hubName === null) {
      const right = cells.filter((c) => c.col > label.col && c.text).sort((a, b) => a.col - b.col)[0]
      hubName = right?.text ?? null
    }
    const found: Partial<Record<Column, number>> = {}
    findColumns(cells, found)
    if (found.title === undefined) continue
    let dataFrom = index + 1
    if (found.start === undefined || found.end === undefined) {
      const next = ordered[index + 1]
      if (next) {
        findColumns(next[1], found)
        dataFrom = index + 2
      }
    }
    if (found.start !== undefined && found.end !== undefined) {
      firstDataRow = dataFrom
      Object.assign(columns, found)
      break
    }
  }
  if (firstDataRow === null) {
    problems.push('no header row with Session title and Start/End (from/to) columns (is this the current template?)')
    return { hubName, headerFound: false, sessions: [], problems }
  }

  const sessions: HubSessionRow[] = []
  const missingKeys: number[] = []
  let bannerDay: EventDay | null = null
  for (const [row, cells] of ordered.slice(firstDataRow)) {
    const at = (col: Column) => (columns[col] === undefined ? undefined : cells.find((c) => c.col === columns[col]))
    const text = (col: Column) => at(col)?.text ?? ''
    const line = row + 1
    const title = text('title')
    const first = [...cells].sort((a, b) => a.col - b.col).find((c) => c.text)
    if (!title && first && DAY_BANNER.test(first.text) && columns.day !== first.col) {
      bannerDay = parseDay(first.text, days)
      if (!bannerDay) problems.push(`row ${line}: day banner "${first.text}" not recognised, rows below it are skipped`)
      continue
    }
    const hasAnyInput = title || text('day') || text('start') || text('end') || text('speakers')
    if (!hasAnyInput) continue
    if (!title) {
      problems.push(`row ${line}: no session title, skipped`)
      continue
    }
    const dayText = text('day')
    const day = dayText ? parseDay(dayText, days) : bannerDay ?? defaultDay ?? null
    if (!day) {
      problems.push(
        dayText
          ? `row ${line} "${title}": day "${dayText}" not recognised, skipped`
          : `row ${line} "${title}": no day (tab not named "Day N" and no day banner above it), skipped`
      )
      continue
    }
    const start = parseClock(at('start')?.value ?? null, text('start'))
    const end = parseClock(at('end')?.value ?? null, text('end'))
    if (start === null || end === null) {
      problems.push(`row ${line} "${title}": start "${text('start')}" / end "${text('end')}" not a time, skipped`)
      continue
    }
    if (end <= start) {
      problems.push(`row ${line} "${title}": ends (${text('end')}) before it starts (${text('start')}), skipped`)
      continue
    }
    const key = text('key')
    if (columns.key !== undefined && !key) missingKeys.push(line)
    sessions.push({
      line,
      key,
      title,
      topic: text('topic'),
      description: withLink(text('description'), at('description')?.link),
      format: text('format'),
      speakers: parseSpeakers(text('speakers')),
      start: toUtcMs(day, start, utcOffsetMinutes),
      end: toUtcMs(day, end, utcOffsetMinutes),
      day,
    })
  }
  // Only for sheets that have the column: v4 sheets are keyless by design,
  // and a per-row message would drown the real problems.
  if (missingKeys.length > 0) {
    problems.push(
      `${missingKeys.length} ${missingKeys.length === 1 ? 'row has' : 'rows have'} no Key (row${missingKeys.length === 1 ? '' : 's'} ${missingKeys.join(', ')}): ` +
        `type any short unique text there, or renaming the session loses its saved stars`
    )
  }
  return { hubName, headerFound: true, sessions, problems }
}

/**
 * A cell's "Insert link" target, appended to its text unless the text already
 * spells the URL out: the app turns URLs in descriptions into links, and a
 * linked word would otherwise lose its link on the way.
 */
export function withLink(text: string, link: string | undefined): string {
  if (!link) return text
  if (text.toLowerCase().includes(link.toLowerCase().replace(/\/$/, ''))) return text
  return text ? `${text} ${link}` : link
}

/**
 * Stable, unique session ids within a hub. With a Key (template v5):
 * <hub>-<key>, which survives retitling, so stars and reminders follow the
 * row. Without one: <hub>-<title>, then -day-N, then a counter (a rename
 * orphans the stars; the status endpoint reports keyless rows).
 */
export function hubSessionId(hubId: string, row: Pick<HubSessionRow, 'title' | 'day'> & { key?: string }, taken: Set<string>): string {
  const key = row.key ? defaultSlugify(row.key) : ''
  if (key) {
    const byKey = `${hubId}-${key}`
    if (!taken.has(byKey)) {
      taken.add(byKey)
      return byKey
    }
  }
  const base = `${hubId}-${defaultSlugify(row.title) || 'session'}`
  const perDay = `${base}-day-${row.day.number}`
  for (const candidate of [base, perDay]) {
    if (!taken.has(candidate)) {
      taken.add(candidate)
      return candidate
    }
  }
  for (let n = 2; ; n++) {
    const candidate = `${perDay}-${n}`
    if (!taken.has(candidate)) {
      taken.add(candidate)
      return candidate
    }
  }
}

/**
 * Whether a fresh read of a hub's sheet should stay out of service. A sheet
 * that parses with problems and now yields fewer sessions than the served
 * read looks like a broken edit (a banner or time cell typed over), so the
 * previous read keeps serving until the sheet parses at least as well.
 * Additive edits with one bad row still go live (the bad row is reported).
 */
export function shouldKeepPreviousRead(prev: { rows: number } | undefined, fresh: { rows: number; problems: number }): boolean {
  return prev !== undefined && fresh.problems > 0 && fresh.rows < prev.rows
}
