// Pure planning logic for the AV run-of-show sheets. No Google API calls here,
// so the merge rules can be unit-tested with synthetic rows.
//
// Contract with the AV team: the sync owns the schedule columns and the
// PRETALX ID key column; the crew's columns are carried over unchanged, keyed by
// the Pretalx submission code, wherever the row moves. Which column is which is
// described by a layout, detected from the template's header row, so the same
// merge serves the original AV template (v1), the proposal (v2) and the AV
// team's revision of it (v3).

export type Field =
  | 'num'
  | 'status'
  | 'start'
  | 'dur'
  | 'end'
  | 'actual'
  | 'delta'
  | 'segment'
  | 'format'
  | 'speakers'
  | 'moderator'
  | 'stage'
  | 'track'
  | 'rec'
  | 'slides'
  | 'deckOk'
  | 'mic'
  | 'onSite'
  | 'qa'
  | 'mc'
  | 'contact'
  | 'intro'
  | 'streamIntro'
  | 'streaming'
  | 'cueRef'
  | 'cueType'
  | 'notes'
  | 'internal'
  | 'public'
  | 'editedBy'
  | 'id'

export interface RosLayout {
  name: string
  /** Header row in column order, compared ignoring case and whitespace. */
  headers: string[]
  /** 1-based sheet row of the headers; generated rows start right below. */
  headerRow: number
  /** Whether the template already has the PRETALX ID column (v2) or the sync appends it (v1). */
  keyInTemplate: boolean
  col: Partial<Record<Field, number>>
  /** Schedule fields the sync writes and compares for changes. */
  synced: Field[]
  /** Crew fields carried over from the previous row of the same session. */
  carried: Field[]
  /** Prefilled by the sync while empty, then the crew's: never overwritten once filled. */
  fillOnce?: Field[]
  /** MORNING / AFTERNOON / EVENING divider rows between sessions. */
  blockDividers: boolean
  /** END OF SHOW row below the last session. */
  footer: boolean
  /** Fields written as a per-row formula on every run. */
  formulas: Field[]
  /** Crew tick boxes: real checkboxes (v2) or the template's glyph (v1). */
  checkboxes: Field[]
  emptyCheckbox: string
  statusOptions: string[]
  formatOptions: string[]
  micOptions?: string[]
}

const V1_HEADERS = [
  '#',
  'STATUS',
  'START TIME',
  'DUR (mins)',
  'END TIME',
  'SESSION SEGMENT',
  'FORMAT',
  'SPEAKER NAME',
  'MODERATOR',
  'LOCATION / STAGE',
  'SLIDES / MEDIA',
  'MIC CONFIG',
  'SPEAKER ARRIVED?',
  'AV CUE REF',
  'INTERNAL NOTES',
  'PUBLIC NOTES',
  'LAST EDITED BY',
  'PRETALX ID',
]

const V3_HEADERS = [
  '#',
  'STATUS',
  'START',
  'DUR (min)',
  'END',
  'Q&A (min)',
  'MC (min)',
  'SESSION',
  'SPEAKERS',
  'SPEAKER CONTACT',
  'FORMAT',
  'SLIDES',
  'DECK OK?',
  'INTRO ANIMATION',
  'REC',
  'MODERATOR',
  'MIC',
  'NOTES',
  'PRETALX ID',
]

// v4 (2026-10-31): v3 plus STREAM INTRO ANIMATION right after INTRO ANIMATION.
const V4_HEADERS = [...V3_HEADERS.slice(0, 14), 'STREAM INTRO ANIMATION', ...V3_HEADERS.slice(14)]

const V2_HEADERS = [
  '#',
  'STATUS',
  'START',
  'DUR (min)',
  'END',
  'ACTUAL START',
  'Δ min',
  'SESSION',
  'FORMAT',
  'SPEAKERS',
  'MODERATOR',
  'TRACK',
  'REC',
  'SLIDES',
  'DECK OK?',
  'MIC',
  'ON SITE?',
  'CUE REF',
  'CUE TYPE ↗',
  'NOTES',
  'PRETALX ID',
]

export const STATUS_OPTIONS_V1 = ['CONFIRMED', 'TBC', 'CANCELLED', 'STANDBY', 'DELAYED']
export const STATUS_OPTIONS_V2 = ['CONFIRMED', 'TBC', 'STANDBY', 'DELAYED', 'LIVE', 'DONE', 'CANCELLED']
/** v3 and later: CHANGE paints the whole row bright yellow, over every other colour. */
export const CHANGE_STATUS = 'CHANGE'
export const STATUS_OPTIONS_V3 = ['CONFIRMED', CHANGE_STATUS, 'TBC', 'STANDBY', 'DELAYED', 'LIVE', 'DONE', 'CANCELLED']
export const FORMAT_OPTIONS_V1 = [
  'Keynote',
  'Panel',
  'Fireside Chat',
  'Workshop',
  'Presentation',
  'Performance',
  'Award',
  'Break',
  'Registration',
  'Networking',
  'Opening',
  'Closing',
  'Q&A',
  'Other',
]
export const FORMAT_OPTIONS_V2 = [
  'Keynote',
  'Talk',
  'Lightning Talk',
  'Panel',
  'Fireside Chat',
  'Workshop',
  'Performance',
  'Break',
  'Opening',
  'Closing',
  'Q&A',
  'Other',
]
export const MIC_OPTIONS_V2 = ['Lapel', 'Handheld', 'Headset', 'Podium', 'Panel 2x', 'Panel 3x', 'Panel 4x', 'None']

export const LAYOUT_V1: RosLayout = {
  name: 'v1',
  headers: V1_HEADERS,
  headerRow: 5,
  keyInTemplate: false,
  col: {
    num: 0,
    status: 1,
    start: 2,
    dur: 3,
    end: 4,
    segment: 5,
    format: 6,
    speakers: 7,
    moderator: 8,
    stage: 9,
    slides: 10,
    mic: 11,
    onSite: 12,
    cueRef: 13,
    internal: 14,
    public: 15,
    editedBy: 16,
    id: 17,
  },
  synced: ['start', 'dur', 'end', 'segment', 'format', 'speakers', 'stage', 'slides'],
  carried: ['moderator', 'mic', 'onSite', 'cueRef', 'internal', 'public', 'editedBy'],
  blockDividers: true,
  footer: true,
  formulas: ['num', 'end'],
  checkboxes: [],
  emptyCheckbox: '☐',
  statusOptions: STATUS_OPTIONS_V1,
  formatOptions: FORMAT_OPTIONS_V1,
}

export const LAYOUT_V2: RosLayout = {
  name: 'v2',
  headers: V2_HEADERS,
  headerRow: 5,
  keyInTemplate: true,
  col: {
    num: 0,
    status: 1,
    start: 2,
    dur: 3,
    end: 4,
    actual: 5,
    delta: 6,
    segment: 7,
    format: 8,
    speakers: 9,
    moderator: 10,
    track: 11,
    rec: 12,
    slides: 13,
    deckOk: 14,
    mic: 15,
    onSite: 16,
    cueRef: 17,
    cueType: 18,
    notes: 19,
    id: 20,
  },
  synced: ['start', 'dur', 'end', 'segment', 'format', 'speakers', 'track', 'rec', 'slides'],
  carried: ['actual', 'moderator', 'deckOk', 'mic', 'onSite', 'cueRef', 'notes'],
  blockDividers: true,
  footer: true,
  formulas: ['num', 'end', 'delta', 'cueType'],
  checkboxes: ['deckOk', 'onSite'],
  emptyCheckbox: 'FALSE',
  statusOptions: STATUS_OPTIONS_V2,
  formatOptions: FORMAT_OPTIONS_V2,
  micOptions: MIC_OPTIONS_V2,
}

/**
 * v3 (2026-10-20, the AV team's revision of v2): Q&A and MC minutes, one speaker
 * contact and intro animation; no live timing, track, on-site tick or cue sheet
 * (the stage's Q&A QR is one link on the Digital Assets tab). SLIDES and Q&A are
 * prefilled once so the crew can override them ("Laptop", a longer Q&A). Header
 * on row 2 under a version / DAY / STAGE line. STREAMING was dropped on
 * 2026-10-26: NO REC means neither recorded nor streamed.
 */
export const LAYOUT_V3: RosLayout = {
  name: 'v3',
  headers: V3_HEADERS,
  headerRow: 2,
  keyInTemplate: true,
  col: {
    num: 0,
    status: 1,
    start: 2,
    dur: 3,
    end: 4,
    qa: 5,
    mc: 6,
    segment: 7,
    speakers: 8,
    contact: 9,
    format: 10,
    slides: 11,
    deckOk: 12,
    intro: 13,
    rec: 14,
    moderator: 15,
    mic: 16,
    notes: 17,
    id: 18,
  },
  synced: ['start', 'dur', 'end', 'segment', 'speakers', 'contact', 'format', 'rec'],
  carried: ['deckOk', 'intro', 'moderator', 'mic', 'notes'],
  fillOnce: ['qa', 'mc', 'slides'],
  blockDividers: false,
  footer: false,
  formulas: ['num', 'end'],
  checkboxes: ['deckOk'],
  emptyCheckbox: 'FALSE',
  statusOptions: STATUS_OPTIONS_V3,
  formatOptions: FORMAT_OPTIONS_V2,
  micOptions: MIC_OPTIONS_V2,
}

/**
 * v4 (2026-10-31): v3 with a STREAM INTRO ANIMATION column for the crew right
 * after INTRO ANIMATION. A v3 sheet is upgraded in place by inserting that one
 * column, so everything to its right (and any crew column past PRETALX ID) moves
 * with its data.
 */
export const LAYOUT_V4: RosLayout = {
  ...LAYOUT_V3,
  name: 'v4',
  headers: V4_HEADERS,
  col: {
    ...LAYOUT_V3.col,
    streamIntro: 14,
    rec: 15,
    moderator: 16,
    mic: 17,
    notes: 18,
    id: 19,
  },
  carried: ['deckOk', 'intro', 'streamIntro', 'moderator', 'mic', 'notes'],
}

/**
 * v5 (2026-10-31): v4 with END moved after MC, so a row reads left to right as
 * START + DUR (talk) + Q&A + MC = END, the start of the next segment in a
 * regular running order. MC is the speaker change from the AV timer table
 * (fill-once, like Q&A; a formula to the next row's START until 2026-11-02);
 * END is no longer compared with Pretalx (START and DUR carry the slot). A v4
 * sheet is upgraded in place by moving the END column.
 */
const V5_HEADERS = [...V4_HEADERS.slice(0, 4), 'Q&A (min)', 'MC (min)', 'END', ...V4_HEADERS.slice(7)]
export const LAYOUT_V5: RosLayout = {
  ...LAYOUT_V4,
  name: 'v5',
  headers: V5_HEADERS,
  col: { ...LAYOUT_V4.col, qa: 4, mc: 5, end: 6 },
  synced: LAYOUT_V4.synced.filter((f) => f !== 'end'),
}

export const LAYOUTS = [LAYOUT_V1, LAYOUT_V2, LAYOUT_V3, LAYOUT_V4, LAYOUT_V5]

/** v5 and later: END closes the row after MC (START + DUR + Q&A + MC). */
export function endAfterMc(layout: RosLayout): boolean {
  return layout.col.mc !== undefined && layout.col.end! > layout.col.mc
}

/**
 * The AV timer table, per session type: talk + Q&A fill the Pretalx slot and
 * the buffer (speaker change, the MC column) runs up to the next slot.
 *   Talks 20 + 5 + 5 · Mixed format 25 + 0 + 5 · Workshops 50 + 0 + 10 · Lightning 5 + 2 + 3
 * Q&A defaults exist for the two formats that have one (other formats stay 0
 * until the AV team gives numbers); the crew can type their own in both columns.
 */
const QA_MINUTES: Record<string, number> = { talk: 5, 'lightning talk': 2 }
export function qaMinutesFor(type: string): number {
  return QA_MINUTES[(type || '').trim().toLowerCase()] ?? 0
}
/**
 * MC minutes (speaker change) from the timer table, by keyword so the
 * community-led variants of a format get the same buffer: lightning 3,
 * workshops 10, everything else 5. Never the distance to the next row
 * (that was the rule until 2026-11-02 and it swallowed every hole in the schedule).
 */
export function mcMinutesFor(type: string): number {
  const t = (type || '').toLowerCase()
  if (/lightning/.test(t)) return 3
  if (/workshop/.test(t)) return 10
  return 5
}

export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

/** Match a template's header row against the known layouts; the v1 template lacks the key column, which the sync appends. */
export function detectLayout(headerRow: unknown[]): RosLayout | null {
  const found = headerRow.map(normalizeHeader)
  while (found.length && found[found.length - 1] === '') found.pop()
  const same = (expected: string[]) => expected.length === found.length && expected.every((h, i) => h === found[i])
  for (const layout of LAYOUTS) {
    const expected = layout.headers.map(normalizeHeader)
    // A generated v1 sheet carries the appended key column; the v1 template does not.
    if (same(expected) || (!layout.keyInTemplate && same(expected.slice(0, -1)))) return layout
  }
  return null
}

/** Rows read from the top of a sheet (rows[0] is sheet row 1): the layout whose headers sit on its own header row. */
export function detectLayoutInRows(rows: unknown[][]): RosLayout | null {
  for (const layout of LAYOUTS) {
    const found = detectLayout(rows[layout.headerRow - 1] || [])
    if (found === layout) return layout
  }
  return null
}

/** Human-readable differences for the error message when no layout matches. */
export function describeHeaderMismatch(headerRow: unknown[], layout: RosLayout): string {
  const found = headerRow.map(normalizeHeader)
  const expected = (layout.keyInTemplate ? layout.headers : layout.headers.slice(0, -1)).map(normalizeHeader)
  return expected
    .map((h, i) => (found[i] === h ? null : `${colLetter(i)}: expected "${h}", found "${found[i] ?? ''}"`))
    .filter(Boolean)
    .join('; ')
}

export function colLetter(index: number): string {
  let s = ''
  let n = index
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

// Times on the sheet are wall-clock for the stage crew, so they are rendered in
// the event's local timezone (IST is UTC+5:30, which plain UTC can never show).
export const EVENT_TIMEZONES: Record<string, string> = {
  'devcon-7': 'Asia/Bangkok',
  devcon8: 'Asia/Kolkata',
  'test-devcon-8': 'Asia/Kolkata',
}

/** Statuses the AV team sets by hand that a resync must not flip back to CONFIRMED. */
const KEEP_STATUSES = [CHANGE_STATUS, 'TBC', 'STANDBY', 'DELAYED', 'LIVE', 'DONE']
export const CUES_SHEET = 'AV & TECH CUES'

export type PresentingMethod = 'deck' | 'laptop'

export interface RosSession {
  code: string
  title: string
  type: string
  speakers: string
  /** HH:mm in the event timezone */
  start: string
  end: string
  durationMin: number
  slides?: string
  /** The deck was never edited after the pipeline created it */
  slidesUntouched?: boolean
  /** How the speaker said they will present (Pretalx question); unanswered reads as the deck */
  presenting?: PresentingMethod
  /** One line per speaker: Telegram, else another handle (v3) */
  contact?: string
  track?: string
  /** false when the speaker opted out of recording */
  record?: boolean
  /**
   * Not a talk: a Pretalx break or blocker, or a gap we found in the schedule
   * (see gapSessions). Keyed by a generated code; no REC, deck or Q&A.
   */
  kind?: 'break' | 'blocker' | 'gap'
  day: string
  roomId: string
  roomName: string
}

export interface ExistingRow {
  /** Pretalx submission code; empty for a row the AV team added by hand */
  code: string
  /** Formatted cell values, padded to the layout's column count */
  values: string[]
  status: string
  /** Which sheet the row was read from, `${day}/${roomId}` */
  fileKey: string
  /** Human label of that sheet, for change entries */
  fileLabel?: string
  /** Hand-added row without a PRETALX ID (a break, doors open, ...): kept as is, placed by its start time */
  manual?: boolean
}

export type RowKind = 'divider' | 'session' | 'manual' | 'removed-header' | 'removed' | 'footer'

export interface PlannedRow {
  kind: RowKind
  values: (string | number)[]
  code?: string
  /** Column indexes to highlight as changed in this run */
  changed: number[]
}

export interface Change {
  code: string
  title: string
  field: string
  from: string
  to: string
}

export interface FilePlan {
  rows: PlannedRow[]
  changes: Change[]
  stats: { added: number; changed: number; movedIn: number; movedOut: number; removed: number; unchanged: number }
}

export interface PlanInput {
  layout: RosLayout
  fileKey: string
  /** Human label for this sheet, used in change entries, e.g. "Stage 2 · Day 1" */
  label: string
  sessions: RosSession[]
  existingRows: ExistingRow[]
  /** Best known row per code across every sheet (see buildIndex) */
  index: Map<string, ExistingRow>
  /** Where every scheduled session lives now: code -> { fileKey, label } */
  locationOf: Map<string, { fileKey: string; label: string }>
  /** 1-based sheet row of the first planned row, for the formulas */
  firstSheetRow: number
  /** Fresh sheet: everything is new, so nothing is highlighted as a change */
  initial?: boolean
  /** Sheet id of the cue tab, for the v2 jump-link formula */
  cuesGid?: number
}

export const REMOVED_HEADER = '— REMOVED FROM THIS RUN OF SHOW —'
export const FOOTER = '⚑   END OF SHOW'

/** Conference clock: lunch-hour talks still belong to the morning block; the afternoon starts at 13:00. */
export function blockFor(start: string): string {
  const hour = parseInt(start.split(':')[0], 10)
  if (hour < 13) return 'MORNING'
  if (hour < 18) return 'AFTERNOON'
  return 'EVENING'
}

/** Per-row formulas. `first` and `row` are 1-based sheet rows. */
export const formulas = {
  /** Running count of session titles above and including this row, so hand-inserted rows renumber themselves. */
  num(layout: RosLayout, first: number, row: number): string {
    const seg = colLetter(layout.col.segment!)
    return `=COUNTA(${seg}$${first}:${seg}${row})`
  },
  /** DUR is the talk alone where the layout has a Q&A column: the segment ends after its Q&A (N() reads an empty cell as 0). */
  end(layout: RosLayout, row: number): string {
    const s = colLetter(layout.col.start!)
    const d = colLetter(layout.col.dur!)
    if (layout.col.qa === undefined) return `=IF(${s}${row}<>"",${s}${row}+${d}${row}/1440,"")`
    const q = colLetter(layout.col.qa)
    if (endAfterMc(layout)) {
      const m = colLetter(layout.col.mc!)
      return `=IF(${s}${row}<>"",${s}${row}+(${d}${row}+N(${q}${row})+N(${m}${row}))/1440,"")`
    }
    return `=IF(${s}${row}<>"",${s}${row}+(${d}${row}+N(${q}${row}))/1440,"")`
  },
  /** Minutes late (positive) or early (negative) once the actual start is typed. */
  delta(layout: RosLayout, row: number): string {
    const s = colLetter(layout.col.start!)
    const a = colLetter(layout.col.actual!)
    return `=IF(${a}${row}<>"",ROUND((${a}${row}-${s}${row})*1440),"")`
  },
  /** The cue types filed under this row's CUE REF on the cue tab, as a link to the first of them. */
  cueType(layout: RosLayout, row: number, cuesGid: number | undefined): string {
    if (cuesGid === undefined) return ''
    const ref = `$${colLetter(layout.col.cueRef!)}${row}`
    const refs = `'${CUES_SHEET}'!$A$4:$A$200`
    const types = `'${CUES_SHEET}'!$F$4:$F$200`
    return (
      `=IF(${ref}="","",IFERROR(LET(t,TEXTJOIN(" · ",TRUE,FILTER(${types},${refs}=${ref})),` +
      `HYPERLINK("#gid=${cuesGid}&range=A"&(MATCH(${ref},${refs},0)+3),IF(t="","cue",t))),""))`
    )
  },
}

/** Kept for the v1 tests and callers: the v1 formulas by 1-based rows. */
export function numberFormula(firstSheetRow: number, sheetRow: number): string {
  return formulas.num(LAYOUT_V1, firstSheetRow, sheetRow)
}
export function endTimeFormula(sheetRow: number): string {
  return formulas.end(LAYOUT_V1, sheetRow)
}

/** A URL becomes a short clickable label; anything the AV team typed by hand stays as text. */
export function linkCell(value: string, label: string): string {
  return /^https?:\/\//i.test(value) ? `=HYPERLINK("${value.replace(/"/g, '')}","${label}")` : value
}
export function slidesCell(value: string, label = 'Slides'): string {
  return linkCell(value, label)
}

/**
 * What the SLIDES cell says: the speaker's presentation method when they
 * answered it, else whether the deck we created for them was ever edited.
 */
export const SLIDES_LABELS = {
  deck: 'Slides',
  untouched: 'Slides (untouched)',
  laptop: 'Own laptop',
} as const
const OWN_SLIDES_LABELS = new Set<string>(Object.values(SLIDES_LABELS))

export function slidesLabel(session: Pick<RosSession, 'presenting' | 'slidesUntouched'>): string {
  if (session.presenting === 'laptop') return SLIDES_LABELS.laptop
  return session.slidesUntouched ? SLIDES_LABELS.untouched : SLIDES_LABELS.deck
}

/** The Pretalx answer to "How will you present?", matched by keyword so a reworded option keeps working. */
export function presentingFromAnswer(answer: string | undefined): PresentingMethod | undefined {
  const text = (answer || '').trim()
  if (!text) return undefined
  return /laptop/i.test(text) ? 'laptop' : 'deck'
}

// REC covers recording and streaming (one decision in Pretalx), so the cell says both.
export const REC_ON = 'REC + STREAM'
export const REC_OFF = 'NO REC · NO STREAM'
/** Values written before 2026-10-26: read as their current wording, so a resync reports no change. */
const LEGACY_VALUES: Partial<Record<Field, Record<string, string>>> = { rec: { REC: REC_ON, 'NO REC': REC_OFF } }
/** Synced link columns shown as a label; the sheet is read back as the URL behind it (see hyperlinkTarget). */
export const LINK_FIELDS: Partial<Record<Field, string>> = { slides: 'Slides' }

/** The URL behind a HYPERLINK formula, or the input unchanged. */
export function hyperlinkTarget(cell: string | undefined): string {
  const m = /^=HYPERLINK\("([^"]+)"/i.exec((cell || '').trim())
  return m ? m[1] : cell || ''
}

/** Minutes since midnight for a displayed HH:mm, or null when the cell holds something else. */
export function parseClock(value: string | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec((value || '').trim())
  if (!m) return null
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

export function padRow(values: (string | number | null | undefined)[], count: number): string[] {
  const out: string[] = []
  for (let i = 0; i < count; i++) out.push(values[i] == null ? '' : String(values[i]).trim())
  return out
}

/**
 * A hole in a stage's day: nothing scheduled for GAP_MIN_MINUTES or more after a
 * slot and its speaker change (talk + Q&A + MC, where the row's END lands), up to
 * the next slot (talks, breaks and blockers alike). It gets a row of its own,
 * keyed like a break, so the crew sees the hole instead of a jump between END
 * and the next START. The schedule team puts deliberate pauses in Pretalx as
 * breaks, which are bars already.
 */
export const GAP_MIN_MINUTES = 20
export const GAP_TITLE = 'Gap · nothing scheduled'
/** PRETALX ID of a gap row (GAP-<room>-<day>-<n>, numbered in time order within the stage's day). */
export const GAP_CODE = /^GAP-/

const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function gapSessions(scheduled: RosSession[], dayNumber: (day: string) => number | string, minMinutes = GAP_MIN_MINUTES): RosSession[] {
  const byDay = new Map<string, RosSession[]>()
  for (const s of scheduled) {
    const key = `${s.day}/${s.roomId}`
    byDay.set(key, [...(byDay.get(key) ?? []), s])
  }
  const out: RosSession[] = []
  for (const group of byDay.values()) {
    const timed = group
      .map((s) => ({ s, start: parseClock(s.start), end: parseClock(s.end) }))
      .filter((t): t is { s: RosSession; start: number; end: number } => t.start !== null && t.end !== null)
      // a break or blocker ends when it ends; a talk's row runs on for its speaker change
      .map((t) => ({ ...t, end: t.end + (t.s.kind ? 0 : mcMinutesFor(t.s.type)) }))
      .sort((a, b) => a.start - b.start || a.end - b.end)
    // The latest end so far: a slot nested inside a longer one opens no hole after itself.
    let covered: number | null = null
    let n = 0
    for (const { s, start, end } of timed) {
      if (covered !== null && start - covered >= minMinutes) {
        n++
        out.push({
          code: `GAP-${s.roomId}-${dayNumber(s.day) || s.day}-${n}`,
          kind: 'gap',
          title: GAP_TITLE,
          type: 'Gap',
          speakers: '',
          start: clock(covered),
          end: clock(start),
          durationMin: start - covered,
          day: s.day,
          roomId: s.roomId,
          roomName: s.roomName,
        })
      }
      covered = covered === null ? end : Math.max(covered, end)
    }
  }
  return out
}

/** Whether the crew typed anything in the carried columns (an unticked box reads back as FALSE). */
function hasCrewText(layout: RosLayout, values: string[]): boolean {
  return layout.carried.some((f) => {
    const v = values[layout.col[f]!]
    return v !== '' && v !== 'FALSE'
  })
}

/**
 * Parse the rows read from a sheet. A PRETALX ID makes a keyed row; a row with
 * content in a crew or schedule column but no id is a hand-added row; a row with
 * text in column A only (dividers, footer) is structure and is rebuilt every run.
 */
export function parseExistingRows(
  raw: (string | number | null | undefined)[][],
  layout: RosLayout,
  fileKey: string,
  fileLabel?: string
): ExistingRow[] {
  const rows: ExistingRow[] = []
  const count = layout.headers.length
  const idCol = layout.col.id!
  const formulaCols = new Set(layout.formulas.map((f) => layout.col[f]!))
  for (const r of raw) {
    const values = padRow(r, count)
    const code = values[idCol]
    const status = values[layout.col.status!]
    if (code) rows.push({ code, values, status, fileKey, fileLabel })
    else if (values.some((v, i) => v !== '' && i !== 0 && i !== idCol && !formulaCols.has(i))) {
      rows.push({ code: '', values, status, fileKey, fileLabel, manual: true })
    }
  }
  return rows
}

/** One row per code across all sheets, preferring a live row over one parked as CANCELLED. */
export function buildIndex(rows: ExistingRow[]): Map<string, ExistingRow> {
  const index = new Map<string, ExistingRow>()
  for (const row of rows) {
    if (!row.code) continue
    const current = index.get(row.code)
    if (!current) {
      index.set(row.code, row)
      continue
    }
    if (row.status !== 'CANCELLED' && current.status === 'CANCELLED') index.set(row.code, row)
  }
  return index
}

function nextStatus(previous: string | undefined): string {
  if (previous && KEEP_STATUSES.includes(previous)) return previous
  return 'CONFIRMED'
}

const FIELD_LABELS: Partial<Record<Field, string>> = {
  start: 'START TIME',
  dur: 'DUR (mins)',
  end: 'END TIME',
  segment: 'SESSION SEGMENT',
  format: 'FORMAT',
  speakers: 'SPEAKER NAME',
  stage: 'LOCATION / STAGE',
  track: 'TRACK',
  rec: 'REC',
  slides: 'SLIDES / MEDIA',
  contact: 'SPEAKER CONTACT',
}

/** The value the sync writes for a schedule field (before formulas and link wrapping). */
function syncedValue(field: Field, session: RosSession): string {
  switch (field) {
    case 'start':
      return session.start
    case 'dur':
      return String(session.durationMin)
    case 'end':
      return session.end
    case 'segment':
      return session.title
    case 'format':
      return session.type
    case 'speakers':
      return session.speakers
    case 'stage':
      return session.roomName
    case 'track':
      return session.track || ''
    case 'rec':
      if (session.kind) return ''
      return session.record === false ? REC_OFF : REC_ON
    case 'contact':
      return session.contact || ''
    default:
      return ''
  }
}

/** Talk minutes: the Pretalx slot minus the Q&A typed or defaulted in the Q&A cell (never below 0). */
export function talkMinutes(session: Pick<RosSession, 'durationMin'>, qa: string): string {
  const q = parseInt(qa, 10)
  return String(Math.max(0, session.durationMin - (Number.isFinite(q) && q > 0 ? q : 0)))
}

function applyFormulas(
  layout: RosLayout,
  values: (string | number)[],
  firstSheetRow: number,
  sheetRow: number,
  cuesGid: number | undefined,
  only?: Field[]
) {
  for (const f of layout.formulas) {
    if (only && !only.includes(f)) continue
    const col = layout.col[f]!
    if (f === 'num') values[col] = formulas.num(layout, firstSheetRow, sheetRow)
    if (f === 'end') values[col] = formulas.end(layout, sheetRow)
    if (f === 'delta') values[col] = formulas.delta(layout, sheetRow)
    if (f === 'cueType') values[col] = formulas.cueType(layout, sheetRow, cuesGid)
  }
}

export function planFile(input: PlanInput): FilePlan {
  const { layout, fileKey, label, sessions, existingRows, index, locationOf, firstSheetRow, initial, cuesGid } = input
  const col = layout.col as Record<Field, number>
  const count = layout.headers.length
  const rows: PlannedRow[] = []
  const changes: Change[] = []
  const stats = { added: 0, changed: 0, movedIn: 0, movedOut: 0, removed: 0, unchanged: 0 }
  const scheduledHere = new Set(sessions.map((s) => s.code))
  const highlightOnAdd = [col.status, ...layout.synced.map((f) => col[f])]
  const fillOnce = layout.fillOnce || []

  // Hand-added rows keep their place in the day by start time; without a
  // readable time they go after the last timed row.
  type Entry = { session?: RosSession; manual?: ExistingRow; at: number }
  const entries: Entry[] = [
    ...sessions.map((session) => ({ session, at: parseClock(session.start) ?? Infinity })),
    ...existingRows.filter((r) => r.manual).map((manual) => ({ manual, at: parseClock(manual.values[col.start]) ?? Infinity })),
  ].sort((a, b) => a.at - b.at)

  let block = ''
  for (const entry of entries) {
    if (layout.blockDividers && entry.at !== Infinity) {
      const start = entry.session?.start ?? entry.manual!.values[col.start]
      const entryBlock = blockFor(start)
      if (entryBlock !== block) {
        block = entryBlock
        rows.push({ kind: 'divider', values: [`— ${block} SESSION —`], changed: [] })
      }
    }
    const sheetRow = firstSheetRow + rows.length

    if (entry.manual) {
      const values: (string | number)[] = [...entry.manual.values]
      const timed = parseClock(values[col.start] as string) !== null && /^\d+$/.test(String(values[col.dur]))
      applyFormulas(layout, values, firstSheetRow, sheetRow, cuesGid, timed ? undefined : layout.formulas.filter((f) => f !== 'end' && f !== 'delta'))
      values[col.slides] = slidesCell(entry.manual.values[col.slides])
      rows.push({ kind: 'manual', values, changed: [] })
      continue
    }

    const session = entry.session!
    const previous = index.get(session.code)
    const prev = previous?.values
    const values: (string | number)[] = new Array(count).fill('')
    values[col.status] = nextStatus(prev?.[col.status])
    // Q&A minutes: the crew's number once typed, else the AV timer default. A break has none.
    const qa = fillOnce.includes('qa') ? (session.kind ? '' : prev?.[col.qa] || String(qaMinutesFor(session.type))) : undefined
    // MC minutes: the crew's number once typed, else the speaker change of the AV timer table. A
    // break has none. The MC formula written before 2026-11-02 reads back as its text and gives way.
    const prevMc = prev?.[col.mc] ?? ''
    const mc = fillOnce.includes('mc') ? (session.kind ? '' : /^\d+$/.test(prevMc) ? prevMc : String(mcMinutesFor(session.type))) : undefined
    // With a Q&A column, DUR is the talk alone: the Pretalx slot holds talk + Q&A (AV timer table).
    const synced = (f: Field) => (f === 'dur' && qa !== undefined ? talkMinutes(session, qa) : syncedValue(f, session))
    for (const f of layout.synced) values[col[f]] = synced(f)
    // Fill-once SLIDES keeps whatever is in the cell (a crew "Laptop", or the
    // first link); otherwise the Pretalx deck wins and the old link is a fallback.
    // Our own labels are not crew text: they follow the deck and the speaker's answer.
    const slidesOnce = fillOnce.includes('slides')
    const prevSlides = prev?.[col.slides] || ''
    const crewSlides = prevSlides && !/^https?:\/\//i.test(prevSlides) && !OWN_SLIDES_LABELS.has(prevSlides) ? prevSlides : ''
    const prevLink = /^https?:\/\//i.test(prevSlides) ? prevSlides : ''
    const slides = (slidesOnce ? crewSlides || prevLink || session.slides : session.slides || crewSlides || prevLink) || ''
    const slidesText = slidesLabel(session)
    const plainLabel = !session.kind && slidesText !== SLIDES_LABELS.deck && slidesText !== SLIDES_LABELS.untouched
    values[col.slides] = slides ? slidesCell(slides, slidesText) : plainLabel ? slidesText : ''
    for (const f of layout.carried) values[col[f]] = prev?.[col[f]] ?? ''
    // A break or blocker has no deck to tick (an empty checkbox reads back as FALSE).
    if (session.kind) for (const f of layout.checkboxes) values[col[f]] = ''
    // A break has no Q&A: the cell sits inside the break's bar on the sheet.
    if (qa !== undefined) values[col.qa] = qa
    if (mc !== undefined) values[col.mc] = mc
    if (!prev && !session.kind)
      for (const f of layout.checkboxes.length ? layout.checkboxes : (['onSite'] as Field[]))
        if (col[f] !== undefined) values[col[f]] = layout.emptyCheckbox
    applyFormulas(layout, values, firstSheetRow, sheetRow, cuesGid)
    values[col.id] = session.code

    const changed: number[] = []
    let movedIn = false
    if (!prev) {
      stats.added++
      changes.push({ code: session.code, title: session.title, field: 'ADDED', from: '', to: label })
      if (!initial) changed.push(...highlightOnAdd)
    } else {
      if (previous!.fileKey !== fileKey) {
        movedIn = true
        stats.movedIn++
        changes.push({ code: session.code, title: session.title, field: 'MOVED IN', from: previous!.fileLabel ?? previous!.fileKey, to: label })
        if (col.stage !== undefined) changed.push(col.stage)
        else changed.push(col.start)
      } else if (prev[col.status] === 'CANCELLED') {
        changes.push({ code: session.code, title: session.title, field: 'STATUS', from: 'CANCELLED', to: 'CONFIRMED' })
        changed.push(col.status)
      }
      for (const f of layout.synced) {
        // A break's FORMAT follows its kind and sits inside its merged bar, which reads back empty.
        if (session.kind && f === 'format') continue
        const before = prev[col[f]]
        const after = f === 'slides' ? slides : synced(f)
        if (before === after || LEGACY_VALUES[f]?.[before] === after) continue
        // Sheets written before 2026-10-31 hold the whole slot in DUR; the slot itself still shows in START / END.
        if (f === 'dur' && qa !== undefined && before === String(session.durationMin)) continue
        changes.push({ code: session.code, title: session.title, field: FIELD_LABELS[f] || f.toUpperCase(), from: before, to: after })
        if (!changed.includes(col[f])) changed.push(col[f])
      }
      // A sync-filled deck link that Pretalx has since replaced: report it, the cell is the crew's now.
      const kept = prev[col.slides]
      if (slidesOnce && session.slides && /^https?:\/\//i.test(kept) && kept !== session.slides) {
        changes.push({ code: session.code, title: session.title, field: 'SLIDES (new link in Pretalx, not applied)', from: kept, to: session.slides })
        if (!changed.includes(col.slides)) changed.push(col.slides)
      }
      if (movedIn) {
        // counted as a move, not as a change
      } else if (changed.length) stats.changed++
      else stats.unchanged++
    }

    rows.push({ kind: 'session', values, code: session.code, changed })
  }

  // Rows that used to be on this sheet but are no longer scheduled here: keep
  // them, with their AV notes, parked as CANCELLED so nothing is lost silently.
  // A gap that closed was ours, not the schedule's: it just goes, unless the crew wrote on it.
  const parked = existingRows.filter((r) => !r.manual && !scheduledHere.has(r.code) && !(GAP_CODE.test(r.code) && !hasCrewText(layout, r.values)))
  if (parked.length) {
    rows.push({ kind: 'removed-header', values: [REMOVED_HEADER], changed: [] })
    for (const row of parked) {
      const sheetRow = firstSheetRow + rows.length
      const values: (string | number)[] = [...row.values]
      const wasLive = row.status !== 'CANCELLED'
      values[col.num] = ''
      if (col.mc !== undefined) values[col.mc] = ''
      values[col.status] = 'CANCELLED'
      values[col.slides] = slidesCell(row.values[col.slides])
      applyFormulas(layout, values, firstSheetRow, sheetRow, cuesGid, ['cueType'])
      const now = locationOf.get(row.code)
      if (wasLive) {
        if (now) {
          stats.movedOut++
          changes.push({ code: row.code, title: row.values[col.segment], field: 'MOVED OUT', from: label, to: now.label })
        } else {
          stats.removed++
          changes.push({ code: row.code, title: row.values[col.segment], field: 'REMOVED', from: label, to: 'not in schedule' })
        }
      }
      rows.push({ kind: 'removed', values, code: row.code, changed: wasLive ? [col.status] : [] })
    }
  }

  if (layout.footer) rows.push({ kind: 'footer', values: [FOOTER], changed: [] })
  return { rows, changes, stats }
}
