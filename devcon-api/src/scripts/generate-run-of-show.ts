// Run of show for the AV team: one Google Sheet per day and stage, copied from
// the AV team's own template and then kept in sync with the Pretalx schedule.
//
// The template's header row tells the script which layout it is (the original AV
// template, the v2 proposal, or v3, the AV team's revision of it). Only the schedule columns and the PRETALX ID key
// are ever rewritten. The crew's columns travel with the session, keyed by its
// Pretalx code, when it moves within a sheet, to another stage or to another day.
// Pretalx breaks (published schedule) and blockers (work-in-progress schedule,
// never published) get rows of their own, keyed by kind, stage, day and order.
// Sessions that leave a sheet are parked at the bottom as CANCELLED with their
// notes; every difference is appended to a CHANGES tab and highlighted in the
// sheet until the next run. Rows are rewritten in place below the header, so the
// template's validations, conditional colours and protections keep working. The
// AV & TECH CUES tab is emptied of the template's examples once, at creation, and
// never touched again (v3 has no cue tab; its Digital Assets and Livestreaming
// tabs are the AV team's and never touched). Merge rules live in `utils/run-of-show.ts` and are
// unit-tested there.
//
//   pnpm run-of-show:devcon-7           # devcon-7 from committed data (preview)
//   pnpm run-of-show:test               # test-devcon-8 from Pretalx
//
// Env: ROS_FOLDER_ID (shared-drive folder the service account can write to;
// AV_DRIVE_FOLDER_ID_<EVENT> instead for AV_TREE_EVENTS), ROS_DAYS (csv day numbers),
// ROS_TEMPLATE_ID (the AV template as a Google Sheet), ROS_SOURCE=data|pretalx,
// ROS_DATA_DIR (data mode, defaults to devcon-api/data), ROS_ROOMS (csv room id
// allow-list), ROS_DRY_RUN=true (read and plan only). Google credentials as in
// `clients/google.ts`.
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { AuthenticateServiceAccount } from '@/clients/google'
import { GetRooms, GetScheduleBlocks, GetSessions, GetSpeakers, ScheduleBlock } from '@/clients/pretalx'
import { getPretalxConfig } from '@/utils/config'
import { AV_EVENT_FOLDER, avDayFolder, avRoomFolder, meerkatStageUrl, qaQrKey, qaQrUrl } from '@/utils/av-drive'
import {
  CUES_SHEET,
  EVENT_TIMEZONES,
  ExistingRow,
  LINK_FIELDS,
  FilePlan,
  LAYOUTS,
  RosLayout,
  RosSession,
  buildIndex,
  colLetter,
  describeHeaderMismatch,
  detectLayoutInRows,
  hyperlinkTarget,
  parseExistingRows,
  planFile,
  presentingFromAnswer,
  REC_OFF,
  REC_ON,
} from '@/utils/run-of-show'
import { ListDeckActivity } from '@/clients/slides'
import { deckIdFromUrl } from '@/utils/slides-permissions'

dayjs.extend(utc)
dayjs.extend(timezone)

// Hard guard: only these events may have sheets generated, whatever the caller
// passes. devcon8 added 2026-10-20 to try one day and stage with the AV team
// (ROS_ROOMS + ROS_DAYS) before the full run.
const ROS_ALLOWED_EVENTS = ['devcon-7', 'test-devcon-8', 'devcon8']
// Events whose sheets live in the AV team's own Drive tree, next to the intro
// cards (top folder AV_DRIVE_FOLDER_ID_<EVENT>, as for av-assets): $$EVENT/<Room>/<Day N - Mon D>/.
// Other events get <ROS_FOLDER_ID>/<Day N · ddd D MMM>/<Stage> day folders.
const AV_TREE_EVENTS = ['devcon8']

const eventId = process.argv[2] || 'devcon8'
const TZ = EVENT_TIMEZONES[eventId] ?? 'UTC'
const TZ_LABEL: Record<string, string> = { 'Asia/Kolkata': 'IST', 'Asia/Bangkok': 'ICT' }
const TEMPLATE_ID = process.env.ROS_TEMPLATE_ID
const SOURCE: 'data' | 'pretalx' = process.env.ROS_SOURCE === 'data' ? 'data' : 'pretalx'
const DATA_DIR = process.env.ROS_DATA_DIR || path.join(__dirname, '../../data')
const ROOMS = (process.env.ROS_ROOMS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
/** Day numbers (1-based) to limit a run to, like ROS_ROOMS for rooms. */
const DAYS = (process.env.ROS_DAYS || '')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => n > 0)
const DRY_RUN = process.env.ROS_DRY_RUN === 'true'
// Rewrite every sheet even when nothing differs from the last write (e.g. after the crew reformatted one).
const FORCE = process.env.ROS_FORCE === 'true'
const AV_TREE = AV_TREE_EVENTS.includes(eventId)
// The AV tree's top folder is the one av-assets uses (same secret, AV_DRIVE_FOLDER_ID_<EVENT>).
const FOLDER_ID = AV_TREE ? process.env[`AV_DRIVE_FOLDER_ID_${eventId.toUpperCase().replace(/-/g, '_')}`] : process.env.ROS_FOLDER_ID
const FOLDER_MIME = 'application/vnd.google-apps.folder'

const SHEET = 'RUN OF SHOW'
const STYLE_SHEET = '_style'
const CHANGES_SHEET = 'CHANGES'
/** Rows read to find the header row: v1/v2 have it on row 5, v3 on row 2. */
const TOP_ROWS = 5
/** 1-based sheet row of the first generated row (right below the headers); as a 0-based index it is the header row. */
const firstRow = (layout: RosLayout) => layout.headerRow + 1
const firstIndex = (layout: RosLayout) => layout.headerRow
const HIGHLIGHT = { red: 1, green: 0.92, blue: 0.6 }
const PARKED_TEXT = { red: 0.6, green: 0.6, blue: 0.6 }
// Breaks and blockers read as a bar across the running order (like the v2
// session dividers), not as sessions: dark blue for breaks, dark grey for a room held.
const WHITE = { red: 1, green: 1, blue: 1 }
const BLOCK_STYLE = {
  break: { bg: { red: 0.12, green: 0.22, blue: 0.42 }, fg: WHITE },
  blocker: { bg: { red: 0.33, green: 0.35, blue: 0.38 }, fg: WHITE },
}
const STATUS_COLOURS: Record<string, { bg: any; fg: any }> = {
  CONFIRMED: { bg: { red: 0.83, green: 0.93, blue: 0.85 }, fg: { red: 0.11, green: 0.45, blue: 0.2 } },
  TBC: { bg: { red: 1, green: 0.95, blue: 0.78 }, fg: { red: 0.55, green: 0.4, blue: 0 } },
  CANCELLED: { bg: { red: 0.97, green: 0.85, blue: 0.85 }, fg: { red: 0.6, green: 0.1, blue: 0.1 } },
  STANDBY: { bg: { red: 0.99, green: 0.9, blue: 0.78 }, fg: { red: 0.6, green: 0.3, blue: 0 } },
  DELAYED: { bg: { red: 0.99, green: 0.9, blue: 0.78 }, fg: { red: 0.6, green: 0.3, blue: 0 } },
  LIVE: { bg: { red: 0.85, green: 0.9, blue: 1 }, fg: { red: 0.1, green: 0.3, blue: 0.7 } },
  DONE: { bg: { red: 0.92, green: 0.92, blue: 0.92 }, fg: { red: 0.45, green: 0.45, blue: 0.45 } },
}
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']

/** What differs between the templates besides the column map (see utils/run-of-show.ts). */
interface LayoutIo {
  /** Rows of the template kept in the hidden _style tab, 0-based: divider, two data rows (banding), footer. */
  style: { divider: number; dataEven: number; dataOdd: number; footer?: number }
  /** Cell for the day label: a full-width band (v1, v2) or a single cell (v3). */
  dayCell: string
  dayBand: boolean
  /** Cell for the stage name, when the layout has one of its own. */
  stageCell?: string
  /** v3: one large title line (day, date, stage) in dayCell, free to run across the columns. */
  titleLine?: boolean
  /** Cell holding the published Pretalx schedule version. */
  versionCell?: string
  /** Cells emptied on every run (an older layout's content the title line replaces). */
  clearCells?: string[]
  /** Ranges emptied once when a sheet is created: the template's example content. */
  templateClears: string[]
  /** After a shrink, rows below the footer: reset to default (v1) or re-apply the tinted data style (v2). */
  leftover: 'clear' | 'style'
  /** Cell holding the stage's stream link, if the layout has one. */
  streamCell?: string
  /** Tab listing the AV team's digital assets: the sync fills only its own rows (Q&A QR, Meerkat stage), found by name. */
  assets?: { tab: string; qaQrRow: RegExp; qaQrName: string; meerkatRow: RegExp; meerkatName: string }
  strictLists: boolean
}
const LAYOUT_IO: Record<string, LayoutIo> = {
  v1: {
    style: { divider: 5, dataEven: 6, dataOdd: 7, footer: 26 },
    dayCell: 'A3',
    dayBand: true,
    templateClears: [`'${CUES_SHEET}'!A5:Z`],
    leftover: 'clear',
    strictLists: false,
  },
  v2: {
    style: { divider: 5, dataEven: 6, dataOdd: 6, footer: 15 },
    dayCell: 'A3',
    dayBand: true,
    templateClears: [`'${CUES_SHEET}'!A4:A200`, `'${CUES_SHEET}'!F4:N200`, `'${CHANGES_SHEET}'!A2:F`],
    leftover: 'style',
    streamCell: 'S3',
    strictLists: true,
  },
  // Template rows: 1 version / title line, 2 headers, 3.. examples, then a REMOVED divider and a parked example.
  v3: {
    style: { divider: 8, dataEven: 2, dataOdd: 2 },
    dayCell: 'B1',
    dayBand: false,
    titleLine: true,
    versionCell: 'A1',
    clearCells: ['C1'],
    assets: {
      tab: 'Digital Assets',
      qaQrRow: /^(app\s+)?q\s*&\s*a\s+qr/i,
      qaQrName: 'App Q&A QR code',
      meerkatRow: /^meerkat/i,
      meerkatName: 'Meerkat stage',
    },
    templateClears: [`'${CHANGES_SHEET}'!A2:F`],
    leftover: 'style',
    strictLists: true,
  },
}

interface RawSession {
  sourceId: string
  title: string
  type?: string
  track?: string
  doNotRecord?: boolean
  speakers?: any[]
  slot_start?: number | string | null
  slot_end?: number | string | null
  slot_roomId?: string | null
  resources_presentation?: string
  /** "untouched" or "edited <date>", from the last slides run (Pretalx question) */
  slidesLastEdit?: string
  presentingAnswer?: string
}
interface Room {
  id: string
  name: string
  [key: string]: any
}
interface DriveItem {
  id: string
  name: string
  mimeType: string
  parents?: string[]
  appProperties?: Record<string, string>
  createdTime?: string
}
interface StageFile {
  day: string
  roomId: string
  roomName: string
  label: string
  fileKey: string
  sessions: RosSession[]
  streamUrl?: string
  /** The stage's Q&A QR for that day: the image av-assets put next to the cards, else the site's download. */
  qaQr?: string
  drive?: DriveItem
}

const problems: string[] = []
const summary = { filesCreated: 0, filesWritten: 0, filesSkipped: 0, sessions: 0, changes: 0 }
const startedAt = Date.now()

function heading(text: string) {
  console.log(`\n${text}`)
}
function line(text: string) {
  console.log(`  ${text}`)
}
function problem(text: string) {
  problems.push(text)
  console.log(`  ✗ ${text}`)
}
function toMs(value: number | string): number {
  if (typeof value === 'number') return value < 1e12 ? value * 1000 : value
  return new Date(value).getTime()
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
// ROS_PROFILE=1: total time per kind of Google call, printed at the end (where does a run spend its time).
const PROFILE = process.env.ROS_PROFILE === '1'
const profile = new Map<string, { calls: number; ms: number }>()
/** Google quotas are per minute; back off on 429/5xx instead of failing the run. */
async function withRetry<T>(what: string, fn: () => Promise<T>, attempts = 6): Promise<T> {
  const kind = what.replace(/ (of|in|for|into|to) .*$/, '')
  const started = Date.now()
  for (let i = 0; ; i++) {
    try {
      const result = await fn()
      if (PROFILE) {
        const p = profile.get(kind) || { calls: 0, ms: 0 }
        profile.set(kind, { calls: p.calls + 1, ms: p.ms + Date.now() - started })
      }
      return result
    } catch (e: any) {
      const status = e?.code || e?.response?.status
      const retryable = status === 429 || (status >= 500 && status < 600)
      if (!retryable || i >= attempts - 1) throw new Error(`${what}: ${e?.response?.data?.error?.message || e?.message || e}`)
      const wait = Math.min(60000, 2000 * 2 ** i)
      line(`… ${what}: HTTP ${status}, retrying in ${wait / 1000}s`)
      await sleep(wait)
    }
  }
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

interface Sources {
  sessions: RawSession[]
  rooms: Room[]
  speakerName: Map<string, string>
  /** Best way to reach a speaker, by speaker id and code (v3 SPEAKER CONTACT) */
  speakerContact: Map<string, string>
  /** Breaks and blockers (Pretalx source only) */
  blocks: ScheduleBlock[]
  /** Published Pretalx schedule version (Pretalx source only) */
  version: string | null
}

/** Telegram first (Pretalx only, it is never in the committed data), then the public handles. */
function contactOf(sp: any): string {
  const handle = (v: string) => (/\s/.test(v.trim()) ? v.trim() : `@${v.trim().replace(/^(https?:\/\/)?(t\.me\/|x\.com\/|twitter\.com\/)?@?/i, '')}`)
  if (sp.telegram) return `TG ${handle(sp.telegram)}`
  if (sp.twitter) return `X ${handle(sp.twitter)}`
  if (sp.farcaster) return `FC ${handle(sp.farcaster)}`
  if (sp.website) return sp.website
  return ''
}

function indexSpeakers(speakers: any[]): Pick<Sources, 'speakerName' | 'speakerContact'> {
  const speakerName = new Map<string, string>()
  const speakerContact = new Map<string, string>()
  for (const s of speakers) {
    const contact = contactOf(s)
    for (const key of [s.id, s.sourceId]) {
      if (!key) continue
      speakerName.set(key, s.name)
      if (contact) speakerContact.set(key, contact)
    }
  }
  return { speakerName, speakerContact }
}

async function loadFromPretalx(): Promise<Sources> {
  const config = getPretalxConfig(eventId)
  line(`source: Pretalx ${config.PRETALX_BASE_URI}`)
  const [sessions, rooms, speakers, { version, blocks }] = await Promise.all([
    // With contacts: also brings the crew-only answers (deck activity, presentation method).
    GetSessions({ inclContacts: true }, config) as Promise<RawSession[]>,
    GetRooms(config) as Promise<Room[]>,
    // Contacts are for the stage crew's sheet only; they never reach the public data.
    GetSpeakers({ inclContacts: true }, config) as Promise<any[]>,
    GetScheduleBlocks(config),
  ])
  return { sessions, rooms, ...indexSpeakers(speakers), blocks, version }
}

function readJsonDir<T>(dir: string): T[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as T)
}

function loadFromData(): Sources {
  line(`source: committed data ${path.relative(process.cwd(), DATA_DIR) || '.'}`)
  const sessions = readJsonDir<RawSession>(path.join(DATA_DIR, 'sessions', eventId))
  const rooms = readJsonDir<Room>(path.join(DATA_DIR, 'rooms', eventId))
  return { sessions, rooms, ...indexSpeakers(readJsonDir<any>(path.join(DATA_DIR, 'speakers'))), blocks: [], version: null }
}

function toRosSessions({ sessions: raw, rooms, speakerName, speakerContact }: Sources): RosSession[] {
  const out: RosSession[] = []
  for (const s of raw) {
    if (!s.slot_start || !s.slot_end || !s.slot_roomId || !s.sourceId) continue
    const startMs = toMs(s.slot_start)
    const endMs = toMs(s.slot_end)
    const start = dayjs(startMs).tz(TZ)
    const room = rooms.find((r) => r.id === s.slot_roomId)
    const people = (s.speakers || [])
      .map((sp: any) => {
        const key = typeof sp === 'object' ? sp.id || sp.sourceId : sp
        const name = typeof sp === 'object' ? sp.name : speakerName.get(sp) || sp
        return { name, contact: (typeof sp === 'object' && contactOf(sp)) || speakerContact.get(key) || '' }
      })
      .filter((p: any) => p.name)
    const speakers = people.map((p: any) => p.name).join(', ')
    const contact = people
      .filter((p: any) => p.contact)
      .map((p: any) => (people.length > 1 ? `${p.name}: ${p.contact}` : p.contact))
      .join('\n')
    out.push({
      code: s.sourceId,
      title: s.title,
      type: s.type || '',
      speakers,
      start: start.format('HH:mm'),
      end: dayjs(endMs).tz(TZ).format('HH:mm'),
      durationMin: Math.round((endMs - startMs) / 60000),
      slides: s.resources_presentation || undefined,
      slidesUntouched: s.slidesLastEdit === 'untouched',
      presenting: presentingFromAnswer(s.presentingAnswer),
      contact,
      track: s.track || '',
      record: !s.doNotRecord,
      day: start.format('YYYY-MM-DD'),
      roomId: s.slot_roomId,
      roomName: room?.name || s.slot_roomId,
    })
  }
  return out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.title.localeCompare(b.title)))
}

/** PRETALX ID of a break or blocker row (see toBlockSessions). */
const BLOCK_CODE = /^(BREAK|BLOCKER)-/

/**
 * Breaks and blockers as rows. They have no Pretalx code, so the key is kind,
 * stage, day and their order among that kind on the stage that day: a lunch
 * break that moves keeps its row and the crew's notes.
 */
function toBlockSessions(blocks: ScheduleBlock[], rooms: Room[], dayNumber: (day: string) => number): RosSession[] {
  const out: RosSession[] = []
  const seen = new Map<string, number>()
  for (const b of [...blocks].sort((a, c) => toMs(a.start) - toMs(c.start))) {
    const startMs = toMs(b.start)
    const endMs = toMs(b.end)
    const start = dayjs(startMs).tz(TZ)
    const day = start.format('YYYY-MM-DD')
    const group = `${b.kind}/${b.roomId}/${day}`
    const n = (seen.get(group) ?? 0) + 1
    seen.set(group, n)
    out.push({
      code: `${b.kind.toUpperCase()}-${b.roomId}-${dayNumber(day) || day}-${n}`,
      kind: b.kind,
      title: b.title,
      type: b.kind === 'blocker' ? 'Blocker' : 'Break',
      speakers: '',
      start: start.format('HH:mm'),
      end: dayjs(endMs).tz(TZ).format('HH:mm'),
      durationMin: Math.round((endMs - startMs) / 60000),
      day,
      roomId: b.roomId,
      roomName: rooms.find((r) => r.id === b.roomId)?.name || b.roomId,
    })
  }
  return out
}

/** The stage's stream for that day, when the room data has one. */
function streamUrlFor(room: Room | undefined, dayNumber: number): string | undefined {
  if (!room) return undefined
  return room[`youtubeStreamUrl_${dayNumber}`] || room.youtubeStreamUrl || undefined
}

// ---------------------------------------------------------------------------
// Drive layout: <folder>/Day N · ddd D MMM/<Stage name>
// ---------------------------------------------------------------------------

function dayFolderName(day: string, n: number) {
  return `Day ${n} · ${dayjs(day).format('ddd D MMM')}`
}
/** In the AV tree every day folder holds many files, so the sheet name carries stage and day. */
function stageFileName(file: StageFile, n: number) {
  return AV_TREE ? `Run of Show · ${file.roomName} · Day ${n}` : file.roomName
}
function dayLabelCell(day: string, n: number, roomName: string) {
  return `  DAY ${n} · ${dayjs(day).format('dddd, D MMMM YYYY')} · ${roomName} · times in ${TZ_LABEL[TZ] || TZ}`
}
/** v3's DAY cell: the stage name has a cell of its own. */
function shortDayCell(day: string, n: number) {
  return `DAY ${n} · ${dayjs(day).format('ddd')}`
}
/** v3's title line: day, date and stage in one cell that runs across the columns. */
function titleLineCell(day: string, n: number, roomName: string) {
  return `DAY ${n} · ${dayjs(day).format('ddd D MMM')} · ${roomName}`
}

/** Every item matching a Drive query (all pages); `everywhere` searches all drives the account can see. */
async function listQuery(drive: any, q: string, what: string, everywhere = false): Promise<DriveItem[]> {
  const items: DriveItem[] = []
  let pageToken: string | undefined
  do {
    const res: any = await withRetry(what, () =>
      drive.files.list({
        q,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        ...(everywhere ? { corpora: 'allDrives' } : {}),
        pageSize: 1000,
        pageToken,
        fields: 'nextPageToken,files(id,name,mimeType,parents,appProperties,createdTime)',
      })
    )
    items.push(...(res.data.files || []))
    pageToken = res.data.nextPageToken
  } while (pageToken)
  return items
}
function listChildren(drive: any, parentId: string): Promise<DriveItem[]> {
  return listQuery(drive, `'${parentId}' in parents and trashed=false`, 'list folder')
}

/**
 * Walk <folder>/<day folders>/<stage sheets>. Items are recognised by the
 * appProperties stamped at creation, not by name, so renames are harmless. The
 * service account is usually a folder-level member only, which rules out
 * searching the shared drive as a whole.
 */
const mine = (f: DriveItem, kind: string) => f.appProperties?.ros_event === eventId && f.appProperties?.ros_kind === kind

async function listManaged(drive: any, roomFolders: Set<string>): Promise<{ dayFolders: DriveItem[]; stageFiles: DriveItem[] }> {
  if (AV_TREE) return { dayFolders: [], stageFiles: await listAvTree(drive, roomFolders) }
  const top = await listChildren(drive, FOLDER_ID!)
  const dayFolders = top.filter((f) => f.mimeType === 'application/vnd.google-apps.folder' && mine(f, 'day'))
  const stageFiles: DriveItem[] = []
  for (const folder of dayFolders) {
    const children = await listChildren(drive, folder.id)
    stageFiles.push(...children.filter((f) => f.mimeType === 'application/vnd.google-apps.spreadsheet' && mine(f, 'stage')))
  }
  return { dayFolders, stageFiles }
}

/**
 * Walk $$EVENT/<Room>/<Day> in the AV tree for our sheets. Folders are the AV
 * team's (also used by av-assets.ts), found by name; sheets by appProperties.
 * A sheet the crew moved up into its room folder (a one-day stage) is found
 * there too. With a room allow-list only those rooms' folders are opened.
 */
async function listAvTree(drive: any, roomFolders: Set<string>): Promise<DriveItem[]> {
  const isFolder = (f: DriveItem) => f.mimeType === FOLDER_MIME
  const isSheet = (f: DriveItem) => f.mimeType === 'application/vnd.google-apps.spreadsheet' && mine(f, 'stage')
  const event = (await listChildren(drive, FOLDER_ID!)).find((f) => isFolder(f) && f.name === AV_EVENT_FOLDER)
  if (!event) return []
  const rooms = (await listChildren(drive, event.id)).filter((f) => isFolder(f) && (!ROOMS.length || roomFolders.has(f.name)))
  if (!rooms.length) return []
  // Three queries instead of one listing per room and day folder: the day folders of
  // every room at once, then every tagged sheet; a sheet counts only inside this tree.
  const days = await listQuery(
    drive,
    `mimeType='${FOLDER_MIME}' and trashed=false and (${rooms.map((r) => `'${r.id}' in parents`).join(' or ')})`,
    'list day folders'
  )
  const places = new Set([...rooms, ...days].map((f) => f.id))
  const tagged = await listQuery(
    drive,
    `mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and appProperties has { key='ros_event' and value='${eventId}' } and appProperties has { key='ros_kind' and value='stage' }`,
    'find sheets',
    true
  )
  return tagged.filter((f) => isSheet(f) && (f.parents || []).some((p) => places.has(p)))
}

// One lookup per folder: several sheets share a room folder, which must be created once.
const folderCache = new Map<string, Promise<DriveItem | null>>()
function childFolder(drive: any, parentId: string, name: string): Promise<DriveItem | null> {
  const key = `${parentId}/${name}`
  if (!folderCache.has(key)) {
    folderCache.set(
      key,
      (async () => {
        const found = (await listChildren(drive, parentId)).find((f) => f.mimeType === FOLDER_MIME && f.name === name)
        if (found) return found
        if (DRY_RUN) return null
        const res: any = await withRetry(`create folder ${name}`, () =>
          drive.files.create({
            supportsAllDrives: true,
            fields: 'id,name,mimeType,parents',
            requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
          })
        )
        line(`+ folder ${name}`)
        return res.data
      })()
    )
  }
  return folderCache.get(key)!
}

/** The sheet's folder in the AV tree; in a dry run a missing folder stands in with an empty id. */
async function ensureAvFolder(drive: any, file: StageFile, n: number): Promise<DriveItem> {
  const segments = [AV_EVENT_FOLDER, avRoomFolder(file.roomId, file.roomName), avDayFolder(file.day, n)]
  let parent = FOLDER_ID!
  for (const name of segments) {
    const folder = await childFolder(drive, parent, name)
    if (!folder) return { id: '', name: segments.join('/'), mimeType: FOLDER_MIME }
    parent = folder.id
  }
  return { id: parent, name: segments.join('/'), mimeType: FOLDER_MIME }
}

async function ensureDayFolder(drive: any, existing: DriveItem[], day: string, n: number): Promise<DriveItem> {
  const name = dayFolderName(day, n)
  const found = existing.find((f) => f.appProperties?.ros_kind === 'day' && f.appProperties?.ros_day === day)
  if (found) {
    if (found.name !== name && !DRY_RUN) {
      await withRetry(`rename folder ${found.name}`, () => drive.files.update({ fileId: found.id, supportsAllDrives: true, requestBody: { name } }))
      found.name = name
    }
    return found
  }
  if (DRY_RUN) return { id: '', name, mimeType: 'folder' }
  const res: any = await withRetry(`create folder ${name}`, () =>
    drive.files.create({
      supportsAllDrives: true,
      fields: 'id,name,mimeType,parents,appProperties',
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [FOLDER_ID],
        appProperties: { ros_event: eventId, ros_kind: 'day', ros_day: day },
      },
    })
  )
  line(`+ folder ${name}`)
  return res.data
}

async function ensureStageFile(drive: any, file: StageFile, folder: DriveItem, name: string): Promise<{ item?: DriveItem; created: boolean }> {
  if (file.drive) {
    if (file.drive.name !== name && !DRY_RUN) {
      await withRetry(`rename ${file.drive.name}`, () =>
        drive.files.update({ fileId: file.drive!.id, supportsAllDrives: true, requestBody: { name } })
      )
      line(`~ ${folder.name} · renamed "${file.drive.name}" to "${name}"`)
      file.drive.name = name
    }
    return { item: file.drive, created: false }
  }
  if (DRY_RUN) return { created: false }
  const res: any = await withRetry(`copy template for ${file.label}`, () =>
    drive.files.copy({
      fileId: TEMPLATE_ID,
      supportsAllDrives: true,
      fields: 'id,name,mimeType,parents,appProperties',
      requestBody: {
        name,
        parents: [folder.id],
        appProperties: { ros_event: eventId, ros_kind: 'stage', ros_day: file.day, ros_room: file.roomId },
      },
    })
  )
  summary.filesCreated++
  return { item: res.data, created: true }
}

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

interface SheetIds {
  main: number
  style: number
  changes: number
  cues?: number
  /** The Digital Assets tab, where a missing Meerkat stage row is inserted. */
  assets?: number
  rowCount: number
  columnCount: number
  /** Conditional format rules currently on the tab; the v1 sync replaces them by the STATUS colours. */
  conditionalRules: number
  /** Pixel width of each column of the main tab, as the crew left it */
  columnWidths: number[]
}

async function prepareSheets(
  sheets: any,
  spreadsheetId: string,
  templateSheetId: number,
  label: string,
  created: boolean,
  layout: RosLayout,
  io: LayoutIo
): Promise<SheetIds> {
  if (created) {
    const requests: any[] = [{ updateSpreadsheetProperties: { properties: { timeZone: TZ }, fields: 'timeZone' } }]
    await withRetry(`set time zone of ${label}`, () => sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } }))
    // The template ships example content (cues, change log); a new sheet must not inherit it.
    await withRetry(`clear template examples of ${label}`, () =>
      sheets.spreadsheets.values.batchClear({ spreadsheetId, requestBody: { ranges: io.templateClears } })
    )
  }
  const meta: any = await withRetry(`read ${label}`, () =>
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets(properties(sheetId,title,index,gridProperties(rowCount,columnCount)),conditionalFormats(ranges),data(columnMetadata(pixelSize)))',
    })
  )
  const tabs: any[] = meta.data.sheets || []
  const byTitle = (t: string) => tabs.find((s) => s.properties.title === t)?.properties.sheetId as number | undefined
  const main = byTitle(SHEET)
  if (main === undefined) throw new Error(`${label}: sheet "${SHEET}" not found, was the tab renamed?`)
  const mainTab = tabs.find((s) => s.properties.sheetId === main)
  const grid = mainTab.properties.gridProperties || {}
  const cues = byTitle(CUES_SHEET)
  if (cues === undefined && layout.col.cueRef !== undefined) line(`! ${label}: no "${CUES_SHEET}" tab (not required, left alone)`)

  let style = byTitle(STYLE_SHEET)
  if (style === undefined && !DRY_RUN) {
    // Formats are copied row by row from an untouched copy of the template sheet.
    const copied: any = await withRetry(`copy template styles into ${label}`, () =>
      sheets.spreadsheets.sheets.copyTo({
        spreadsheetId: TEMPLATE_ID,
        sheetId: templateSheetId,
        requestBody: { destinationSpreadsheetId: spreadsheetId },
      })
    )
    style = copied.data.sheetId
    // Pasting a format also pastes the source's conditional rules, so the style copy must carry none.
    const styleMeta: any = await withRetry(`read styles tab of ${label}`, () =>
      sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties(sheetId),conditionalFormats(ranges))' })
    )
    const styleRules: number = (styleMeta.data.sheets.find((t: any) => t.properties.sheetId === style)?.conditionalFormats || []).length
    await withRetry(`hide styles tab in ${label}`, () =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: { sheetId: style, title: STYLE_SHEET, hidden: true, index: tabs.length + 1 },
                fields: 'title,hidden,index',
              },
            },
            ...Array.from({ length: styleRules }, () => ({ deleteConditionalFormatRule: { sheetId: style, index: 0 } })),
          ],
        },
      })
    )
  }

  let changes = byTitle(CHANGES_SHEET)
  if (changes === undefined && !DRY_RUN) {
    const res: any = await withRetry(`add changes tab to ${label}`, () =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: CHANGES_SHEET,
                  index: tabs.length,
                  gridProperties: { frozenRowCount: 1, columnCount: 6 },
                  // grey tab: a generated log, next to the template's gold show and blue cues
                  tabColorStyle: { rgbColor: { red: 0.62, green: 0.62, blue: 0.62 } },
                },
              },
            },
          ],
        },
      })
    )
    changes = res.data.replies[0].addSheet.properties.sheetId
    await withRetry(`write changes header in ${label}`, () =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${CHANGES_SHEET}'!A1:F1`,
        valueInputOption: 'RAW',
        requestBody: { values: [['RUN', 'PRETALX ID', 'SESSION', 'CHANGE', 'FROM', 'TO']] },
      })
    )
    await withRetry(`format changes tab in ${label}`, () =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: { sheetId: changes, startRowIndex: 0, endRowIndex: 1 },
                cell: { userEnteredFormat: { textFormat: { bold: true } } },
                fields: 'userEnteredFormat.textFormat.bold',
              },
            },
            ...[200, 90, 320, 130, 220, 220].map((px, i) => ({
              updateDimensionProperties: {
                range: { sheetId: changes, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
                properties: { pixelSize: px },
                fields: 'pixelSize',
              },
            })),
          ],
        },
      })
    )
  }
  return {
    main,
    style: style ?? -1,
    changes: changes ?? -1,
    cues,
    assets: io.assets ? byTitle(io.assets.tab) : undefined,
    rowCount: grid.rowCount ?? 0,
    columnCount: grid.columnCount ?? 0,
    conditionalRules: (mainTab.conditionalFormats || []).length,
    columnWidths: (mainTab.data?.[0]?.columnMetadata || []).map((c: any) => c.pixelSize ?? 100),
  }
}

/**
 * Everything a run reads from one sheet, in two calls (read quota is 60 a minute):
 * the main tab as displayed (headers and rows), then as formulas (the URL behind a
 * link) together with the Digital Assets labels. Read once, before any write.
 */
interface SheetData {
  shown: any[][]
  formulas: any[][]
  /** Column A of the Digital Assets tab; null when the tab is missing */
  assets: any[][] | null
}
const sheetData = new Map<string, Promise<SheetData>>()
function readSheetData(sheets: any, spreadsheetId: string, label: string): Promise<SheetData> {
  if (!sheetData.has(spreadsheetId)) {
    sheetData.set(
      spreadsheetId,
      (async () => {
        const main = `'${SHEET}'!A1:Z`
        const assetsTab = LAYOUT_IO.v3.assets?.tab
        const shown: any = await withRetry(`read ${label}`, () => sheets.spreadsheets.values.get({ spreadsheetId, range: main }))
        const ranges = assetsTab ? [main, `'${assetsTab}'!A1:A200`] : [main]
        const formulas: any = await withRetry(`read formulas of ${label}`, () =>
          sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges, valueRenderOption: 'FORMULA' })
        ).catch(async (e: Error) => {
          // A sheet without the Digital Assets tab rejects the whole batch: read the main tab alone.
          if (ranges.length === 1) throw e
          return withRetry(`read formulas of ${label}`, () =>
            sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges: [main], valueRenderOption: 'FORMULA' })
          )
        })
        const got = formulas.data.valueRanges || []
        return { shown: shown.data.values || [], formulas: got[0]?.values || [], assets: got[1] ? got[1].values || [] : null }
      })()
    )
  }
  return sheetData.get(spreadsheetId)!
}

/** 0-based index of a column letter (A = 0). */
function colLetterIndex(letters: string): number {
  return letters.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1
}

/** A sheet keeps working with the layout it was created from, even if the template changes later. */
async function readSheetLayout(sheets: any, spreadsheetId: string, label: string): Promise<RosLayout | null> {
  const data = await readSheetData(sheets, spreadsheetId, label)
  return detectLayoutInRows(data.shown.slice(0, TOP_ROWS))
}

async function readExisting(
  sheets: any,
  spreadsheetId: string,
  layout: RosLayout,
  fileKey: string,
  label: string
): Promise<{ rows: ExistingRow[]; rawCount: number }> {
  const last = colLetter(layout.headers.length - 1)
  const first = firstRow(layout)
  const data = await readSheetData(sheets, spreadsheetId, label)
  const width = colLetterIndex(last) + 1
  const raw: any[][] = data.shown.slice(first - 1).map((r) => r.slice(0, width))
  // Link columns (SLIDES, Q&A QR) hold HYPERLINK formulas; compare and carry the URL, not the label.
  const cells: any[][] = data.formulas.slice(first - 1)
  const linkCols = Object.keys(LINK_FIELDS)
    .map((f) => layout.col[f as keyof typeof layout.col])
    .filter((c): c is number => c !== undefined)
  raw.forEach((row, i) => {
    for (const c of linkCols) {
      const cell = cells[i]?.[c]
      if (typeof cell === 'string' && /^=HYPERLINK\(/i.test(cell)) {
        while (row.length <= c) row.push('')
        row[c] = hyperlinkTarget(cell)
      }
    }
  })
  return { rows: parseExistingRows(raw, layout, fileKey, label), rawCount: raw.length }
}

function formatRequests(
  layout: RosLayout,
  io: LayoutIo,
  ids: SheetIds,
  plan: FilePlan,
  span: number,
  formatOptions: string[],
  version: string | null
): any[] {
  const cols = layout.headers.length
  const col = layout.col
  const FIRST_ROW_INDEX = firstIndex(layout)
  const requests: any[] = []
  const copyFormat = (styleRow: number, rowIndex: number, fromCol: number, toCol: number, destFrom = fromCol, destTo = toCol) => ({
    copyPaste: {
      source: { sheetId: ids.style, startRowIndex: styleRow, endRowIndex: styleRow + 1, startColumnIndex: fromCol, endColumnIndex: toCol },
      destination: { sheetId: ids.main, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: destFrom, endColumnIndex: destTo },
      pasteType: 'PASTE_FORMAT',
      pasteOrientation: 'NORMAL',
    },
  })
  const rowRange = (rowIndex: number, fromCol = 0, toCol = cols) => ({
    sheetId: ids.main,
    startRowIndex: rowIndex,
    endRowIndex: rowIndex + 1,
    startColumnIndex: fromCol,
    endColumnIndex: toCol,
  })
  const setHeight = (rowIndex: number, px: number) => ({
    updateDimensionProperties: {
      range: { sheetId: ids.main, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 },
      properties: { pixelSize: px },
      fields: 'pixelSize',
    },
  })
  // v1's template has 17 columns; the key column copies the last one's look.
  const styleCols = layout.keyInTemplate ? cols : cols - 1
  const rowStyle = (styleRow: number, r: number) => {
    const out = [copyFormat(styleRow, r, 0, styleCols)]
    if (!layout.keyInTemplate) out.push(copyFormat(styleRow, r, styleCols - 1, styleCols, cols - 1, cols))
    return out
  }

  // Conditional colours are owned by the sync: pasting row formats strips them
  // from the pasted cells, so drop the old rules first and add fresh ones last.
  for (let i = 0; i < ids.conditionalRules; i++) requests.push({ deleteConditionalFormatRule: { sheetId: ids.main, index: 0 } })

  // Structural rows get the template's fixed heights, applied after the data
  // rows have been auto-fitted to their wrapped content.
  const heights: any[] = []
  let ordinal = 0
  plan.rows.forEach((row, i) => {
    const r = FIRST_ROW_INDEX + i
    if (row.kind === 'divider' || row.kind === 'removed-header' || row.kind === 'footer') {
      requests.push(...rowStyle(row.kind === 'footer' ? io.style.footer ?? io.style.divider : io.style.divider, r))
      requests.push({ mergeCells: { range: rowRange(r, 0, styleCols), mergeType: 'MERGE_ALL' } })
      heights.push(setHeight(r, row.kind === 'footer' ? 39 : 41))
      return
    }
    requests.push(...rowStyle(ordinal++ % 2 === 0 ? io.style.dataEven : io.style.dataOdd, r))
    // Speaker lists (and their contacts) are long; wrap them so the row grows instead of clipping.
    for (const c of [col.speakers, col.contact]) {
      if (c === undefined) continue
      requests.push({
        repeatCell: {
          range: rowRange(r, c, c + 1),
          cell: { userEnteredFormat: { wrapStrategy: 'WRAP' } },
          fields: 'userEnteredFormat.wrapStrategy',
        },
      })
    }
    if (row.kind === 'removed') {
      requests.push({
        repeatCell: {
          range: rowRange(r),
          cell: { userEnteredFormat: { textFormat: { foregroundColor: PARKED_TEXT } } },
          fields: 'userEnteredFormat.textFormat.foregroundColor',
        },
      })
    }
    const block = row.kind === 'session' && row.code ? BLOCK_CODE.exec(row.code)?.[1] : undefined
    if (block) {
      // One bar from SESSION to MIC showing the break's name; times, MC, NOTES and the
      // PRETALX ID stay in their own cells. Colours come from the conditional rule.
      const barEnd = (col.mic ?? col.segment!) + 1
      requests.push({ mergeCells: { range: rowRange(r, col.segment!, barEnd), mergeType: 'MERGE_ALL' } })
      requests.push({
        repeatCell: {
          range: rowRange(r, 0, styleCols),
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat.textFormat.bold',
        },
      })
      requests.push({
        repeatCell: {
          range: rowRange(r, col.segment!, barEnd),
          cell: { userEnteredFormat: { horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', textFormat: { fontSize: 12, bold: true } } },
          fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat.fontSize,textFormat.bold)',
        },
      })
      heights.push(setHeight(r, 34))
    }
    for (const c of row.changed) {
      requests.push({
        repeatCell: {
          range: rowRange(r, c, c + 1),
          cell: { userEnteredFormat: { backgroundColor: HIGHLIGHT } },
          fields: 'userEnteredFormat.backgroundColor',
        },
      })
    }
  })

  // Rows used by the previous run but not by this one.
  const n = plan.rows.length
  if (span > n) {
    const leftover = {
      sheetId: ids.main,
      startRowIndex: FIRST_ROW_INDEX + n,
      endRowIndex: FIRST_ROW_INDEX + span,
      startColumnIndex: 0,
      endColumnIndex: cols,
    }
    if (io.leftover === 'clear') requests.push({ updateCells: { range: leftover, fields: 'userEnteredFormat' } })
    else for (let r = FIRST_ROW_INDEX + n; r < FIRST_ROW_INDEX + span; r++) requests.push(...rowStyle(io.style.dataEven, r))
    requests.push({ setDataValidation: { range: leftover } })
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: ids.main, dimension: 'ROWS', startIndex: FIRST_ROW_INDEX + n, endIndex: FIRST_ROW_INDEX + span },
        properties: { pixelSize: 21 },
        fields: 'pixelSize',
      },
    })
  }

  // Lists and tick boxes on the rows written this run.
  const dataRange = (c: number) => ({
    sheetId: ids.main,
    startRowIndex: FIRST_ROW_INDEX,
    endRowIndex: FIRST_ROW_INDEX + n,
    startColumnIndex: c,
    endColumnIndex: c + 1,
  })
  const list = (values: string[]) => ({
    condition: { type: 'ONE_OF_LIST', values: values.map((v) => ({ userEnteredValue: v })) },
    showCustomUi: true,
    strict: io.strictLists,
  })
  requests.push({ setDataValidation: { range: dataRange(col.status!), rule: list(layout.statusOptions) } })
  requests.push({ setDataValidation: { range: dataRange(col.format!), rule: list(formatOptions) } })
  if (col.mic !== undefined && layout.micOptions) requests.push({ setDataValidation: { range: dataRange(col.mic), rule: list(layout.micOptions) } })
  if (col.rec !== undefined) requests.push({ setDataValidation: { range: dataRange(col.rec), rule: list([REC_ON, REC_OFF]) } })
  if (col.streaming !== undefined) requests.push({ setDataValidation: { range: dataRange(col.streaming), rule: list(['STREAM', 'NO STREAM']) } })
  for (const f of layout.checkboxes) {
    requests.push({ setDataValidation: { range: dataRange(col[f]!), rule: { condition: { type: 'BOOLEAN' }, showCustomUi: true } } })
    // Breaks and blockers have no deck to tick: no checkbox on their rows.
    plan.rows.forEach((row, i) => {
      if (row.code && BLOCK_CODE.test(row.code)) requests.push({ setDataValidation: { range: rowRange(FIRST_ROW_INDEX + i, col[f]!, col[f]! + 1) } })
    })
  }
  if (col.cueType !== undefined && ids.cues !== undefined) {
    requests.push({
      setDataValidation: {
        range: dataRange(col.cueRef!),
        rule: {
          condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: `='${CUES_SHEET}'!$A$4:$A$200` }] },
          showCustomUi: true,
          strict: true,
        },
      },
    })
  }

  requests.push(...conditionalRules(layout, ids, n))

  if (io.dayBand) {
    // Day label: one left-aligned band (the v2 template already has it, merging again is harmless).
    const bandEnd = io.streamCell ? cols - 3 : cols
    requests.push({
      mergeCells: {
        range: { sheetId: ids.main, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: bandEnd },
        mergeType: 'MERGE_ALL',
      },
    })
    requests.push({
      repeatCell: {
        range: { sheetId: ids.main, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 1 },
        cell: { userEnteredFormat: { horizontalAlignment: 'LEFT' } },
        fields: 'userEnteredFormat.horizontalAlignment',
      },
    })
  }
  if (io.titleLine) {
    // A large title line, free to run across the empty cells to its right; the schedule version in A1 at the same size.
    requests.push({
      repeatCell: {
        range: { sheetId: ids.main, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
        cell: { userEnteredFormat: { textFormat: { fontSize: 16, bold: true }, wrapStrategy: 'OVERFLOW_CELL', verticalAlignment: 'MIDDLE', horizontalAlignment: 'LEFT' } },
        fields: 'userEnteredFormat(textFormat.fontSize,textFormat.bold,wrapStrategy,verticalAlignment,horizontalAlignment)',
      },
    })
    requests.push({
      repeatCell: {
        range: { sheetId: ids.main, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
        cell: { userEnteredFormat: { textFormat: { fontSize: 16, bold: true }, wrapStrategy: 'CLIP', verticalAlignment: 'MIDDLE' } },
        fields: 'userEnteredFormat(textFormat.fontSize,textFormat.bold,wrapStrategy,verticalAlignment)',
      },
    })
    // The title starts in B1, so the version cannot overflow: widen # when "v0.36" does not fit.
    const versionWidth = Math.ceil((version ? `v${version}`.length : 0) * 11 + 16)
    if (version && versionWidth > (ids.columnWidths[0] ?? 100)) {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId: ids.main, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
          properties: { pixelSize: versionWidth },
          fields: 'pixelSize',
        },
      })
    }
    heights.push(setHeight(0, 40))
  }
  // Keep the day line and column headers in view on long sheets.
  requests.push({
    updateSheetProperties: {
      properties: { sheetId: ids.main, gridProperties: { frozenRowCount: layout.headerRow } },
      fields: 'gridProperties.frozenRowCount',
    },
  })
  if (!layout.keyInTemplate) {
    // Key column header: same look as the last template header, fixed width.
    requests.push(copyFormat(layout.headerRow - 1, layout.headerRow - 1, cols - 2, cols - 1, cols - 1, cols))
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: ids.main, dimension: 'COLUMNS', startIndex: cols - 1, endIndex: cols },
        properties: { pixelSize: 90 },
        fields: 'pixelSize',
      },
    })
  }
  // Widen a column when its longest text no longer fits ("Slides (untouched)",
  // "NO REC · NO STREAM", a break's PRETALX ID); a column the crew made wider is left as is.
  // REC is sized for its longest value on every sheet, so all sheets line up and a later
  // opt-out never truncates (the NO REC cell is bold).
  const alwaysFit: Record<number, string[]> = col.rec !== undefined ? { [col.rec]: [REC_ON, REC_OFF] } : {}
  for (const c of [col.slides, col.rec, col.id]) {
    if (c === undefined) continue
    const shown = (v: string | number | undefined) => /^=HYPERLINK\("[^"]*","([^"]*)"\)$/i.exec(String(v ?? ''))?.[1] ?? String(v ?? '')
    const texts = [...plan.rows.filter((row) => row.kind === 'session' || row.kind === 'manual').map((row) => shown(row.values[c])), ...(alwaysFit[c] ?? [])]
    const longest = Math.max(0, ...texts.map((t) => t.length))
    const needed = Math.ceil(longest * 8 + 24)
    if (needed > (ids.columnWidths[c] ?? 100)) {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId: ids.main, dimension: 'COLUMNS', startIndex: c, endIndex: c + 1 },
          properties: { pixelSize: needed },
          fields: 'pixelSize',
        },
      })
    }
  }
  // Fit rows to their wrapped content, then pin the structural rows back to the template heights.
  requests.push({
    autoResizeDimensions: {
      dimensions: { sheetId: ids.main, dimension: 'ROWS', startIndex: FIRST_ROW_INDEX, endIndex: FIRST_ROW_INDEX + n },
    },
  })
  requests.push(...heights)
  return requests
}

async function writeFile(
  sheets: any,
  spreadsheetId: string,
  layout: RosLayout,
  io: LayoutIo,
  ids: SheetIds,
  file: StageFile,
  dayNumber: number,
  plan: FilePlan,
  rawCount: number,
  runLabel: string,
  formatOptions: string[],
  version: string | null
) {
  const cols = layout.headers.length
  const n = plan.rows.length
  const span = Math.max(rawCount, n)
  const last = colLetter(cols - 1)
  const FIRST_ROW_INDEX = firstIndex(layout)
  const first = firstRow(layout)

  // Make room, then blank everything below the header that the previous run
  // used (values and merges only: formats, validations and colours are
  // re-applied per row, and the template's column-wide rules stay intact).
  const structure: any[] = []
  if (ids.columnCount < cols) structure.push({ appendDimension: { sheetId: ids.main, dimension: 'COLUMNS', length: cols - ids.columnCount } })
  if (ids.rowCount < FIRST_ROW_INDEX + span)
    structure.push({ appendDimension: { sheetId: ids.main, dimension: 'ROWS', length: FIRST_ROW_INDEX + span - ids.rowCount } })
  const used = {
    sheetId: ids.main,
    startRowIndex: FIRST_ROW_INDEX,
    endRowIndex: FIRST_ROW_INDEX + span,
    startColumnIndex: 0,
    endColumnIndex: Math.max(cols, ids.columnCount),
  }
  structure.push({ unmergeCells: { range: used } })
  structure.push({ updateCells: { range: used, fields: 'userEnteredValue' } })

  const values = plan.rows.map((r) => {
    const v: (string | number)[] = new Array(cols).fill('')
    r.values.forEach((x, i) => (v[i] = x))
    return v
  })
  const title = io.titleLine
    ? titleLineCell(file.day, dayNumber, file.roomName)
    : io.stageCell
    ? shortDayCell(file.day, dayNumber)
    : dayLabelCell(file.day, dayNumber, file.roomName)
  const data: any[] = [
    { range: `'${SHEET}'!${io.dayCell}`, values: [[title]] },
    { range: `'${SHEET}'!A${first}:${last}${first + n - 1}`, values },
  ]
  if (io.stageCell) data.push({ range: `'${SHEET}'!${io.stageCell}`, values: [[file.roomName]] })
  for (const cell of io.clearCells || []) data.push({ range: `'${SHEET}'!${cell}`, values: [['']] })
  if (io.versionCell && version) data.push({ range: `'${SHEET}'!${io.versionCell}`, values: [[`v${version}`]] })
  let insertMeerkatRow: any = null
  if (io.assets) {
    // The AV team owns the tab and its order; only the Q&A QR and Meerkat stage rows are ours.
    const assets = io.assets
    const read = await readSheetData(sheets, spreadsheetId, file.label).catch(() => null)
    const labels: string[] = (read?.assets || []).map((r: any[]) => String(r[0] ?? ''))
    const qaAt = labels.findIndex((v) => assets.qaQrRow.test(v))
    if (qaAt < 0) line(`! ${file.label}: no "${assets.qaQrName}" row on ${assets.tab}, links not written`)
    else {
      if (file.qaQr) data.push({ range: `'${assets.tab}'!A${qaAt + 1}:B${qaAt + 1}`, values: [[assets.qaQrName, `=HYPERLINK("${file.qaQr}","App Q&A QR · ${file.roomName}")`]] })
      let mkAt = labels.findIndex((v) => assets.meerkatRow.test(v))
      if (mkAt < 0 && ids.assets !== undefined) {
        // Right under the QR row, pushing the AV team's own rows down rather than overwriting one.
        insertMeerkatRow = { insertDimension: { range: { sheetId: ids.assets, dimension: 'ROWS', startIndex: qaAt + 1, endIndex: qaAt + 2 }, inheritFromBefore: true } }
        mkAt = qaAt + 1
      }
      if (mkAt >= 0) {
        const url = meerkatStageUrl(file.roomId)
        data.push({ range: `'${assets.tab}'!A${mkAt + 1}:B${mkAt + 1}`, values: [[assets.meerkatName, `=HYPERLINK("${url}","Meerkat · ${file.roomName}")`]] })
      }
    }
  }
  if (!layout.keyInTemplate) data.push({ range: `'${SHEET}'!${last}${layout.headerRow}`, values: [[layout.headers[cols - 1]]] })
  if (io.streamCell) {
    data.push({ range: `'${SHEET}'!${io.streamCell}`, values: [[file.streamUrl ? `=HYPERLINK("${file.streamUrl}","▶ Live stream")` : '']] })
  }
  const format = formatRequests(layout, io, ids, plan, span, formatOptions, version)
  // Pasting the row style puts a checkbox (set to FALSE) on break and blocker rows too; their box is gone by now, empty the cell.
  const blockTicks = plan.rows.flatMap((row, i) =>
    row.code && BLOCK_CODE.test(row.code) ? layout.checkboxes.map((f) => `'${SHEET}'!${colLetter(layout.col[f]!)}${first + i}`) : []
  )
  // Everything this run would send. When it matches what the last write sent and the
  // schedule has no change here, the sheet already looks like this: leave it alone.
  // A code change to values or formats changes the fingerprint, so it still lands.
  const fingerprint = crypto
    .createHash('sha1')
    .update(JSON.stringify({ structure, data, format, blockTicks, insertMeerkatRow }))
    .digest('hex')
  if (!FORCE && !plan.changes.length && file.drive?.appProperties?.ros_hash === fingerprint) return { written: false, fingerprint }

  await withRetry(`prepare ${file.label}`, () => sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: structure } }))
  if (insertMeerkatRow)
    await withRetry(`add Meerkat row to ${file.label}`, () => sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [insertMeerkatRow] } }))
  await withRetry(`write rows of ${file.label}`, () =>
    sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: 'USER_ENTERED', data } })
  )
  await withRetry(`format ${file.label}`, () => sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: format } }))
  if (blockTicks.length) {
    await withRetry(`clear break ticks of ${file.label}`, () => sheets.spreadsheets.values.batchClear({ spreadsheetId, requestBody: { ranges: blockTicks } }))
  }
  if (plan.changes.length) {
    await withRetry(`log changes of ${file.label}`, () =>
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${CHANGES_SHEET}'!A:F`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: plan.changes.map((c) => [runLabel, c.code, c.title, c.field, c.from, c.to]) },
      })
    )
  }
  return { written: true, fingerprint }
}

/** Conditional colours per layout, over the rows written this run (formulas anchor on the first generated row). */
function conditionalRules(layout: RosLayout, ids: SheetIds, n: number): any[] {
  const col = layout.col
  const cols = layout.headers.length
  const FIRST_ROW_INDEX = firstIndex(layout)
  const L = (f: keyof typeof col) => `$${colLetter(col[f]!)}${firstRow(layout)}`
  const range = (c0: number, c1: number) => ({
    sheetId: ids.main,
    startRowIndex: FIRST_ROW_INDEX,
    endRowIndex: FIRST_ROW_INDEX + n,
    startColumnIndex: c0,
    endColumnIndex: c1,
  })
  const rule = (ranges: any[], condition: any, format: any) => ({
    addConditionalFormatRule: { index: 0, rule: { ranges, booleanRule: { condition, format } } },
  })
  // Pushed in reverse priority: each rule is inserted at index 0, so the last pushed wins.
  const out: any[] = []
  if (col.rec !== undefined && col.id !== undefined && col.segment !== undefined) {
    // banding on the plain schedule columns, then "on stage now" (blue), then "speaker not on site" (amber, v2)
    // fill-once columns are the crew's (cream), so they stay out of the grey banding
    const syncCols = (['start', 'dur', 'segment', 'format', 'speakers', 'contact', 'track', 'rec', 'slides', 'id'] as const).filter(
      (f) => !layout.fillOnce?.includes(f)
    )
    out.push(
      rule(
        syncCols.filter((f) => col[f] !== undefined).map((f) => range(col[f]!, col[f]! + 1)),
        { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: `=AND(ISEVEN(ROW()),${L('segment')}<>"")` }] },
        { backgroundColor: { red: 0.97, green: 0.97, blue: 0.955 } }
      )
    )
    // Breaks and blockers: one bar across the row, above the banding (the row
    // format alone loses to it on even rows), below "on stage now".
    for (const [prefix, look] of [
      ['BREAK-', BLOCK_STYLE.break],
      ['BLOCKER-', BLOCK_STYLE.blocker],
    ] as const) {
      out.push(
        rule(
          [range(0, cols)],
          { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: `=LEFT(${L('id')},${prefix.length})="${prefix}"` }] },
          { backgroundColor: look.bg, textFormat: { foregroundColor: look.fg, bold: true } }
        )
      )
    }
    out.push(
      rule(
        [range(0, cols)],
        {
          type: 'CUSTOM_FORMULA',
          values: [
            {
              userEnteredValue: `=AND(${L('segment')}<>"",${L('start')}<>"",${L('status')}<>"CANCELLED",NOW()-TODAY()>=${L(
                'start'
              )},NOW()-TODAY()<${L('end')})`,
            },
          ],
        },
        { backgroundColor: { red: 0.86, green: 0.93, blue: 1 } }
      )
    )
    if (col.onSite !== undefined)
      out.push(
        rule(
          [range(0, cols)],
          {
            type: 'CUSTOM_FORMULA',
            values: [
              {
                userEnteredValue: `=AND(${L('id')}<>"",${L('onSite')}=FALSE,${L('status')}<>"DONE",${L('status')}<>"CANCELLED",${L('start')}<>"",${L(
                  'start'
                )}-(NOW()-TODAY())>0,${L('start')}-(NOW()-TODAY())<TIME(0,15,0))`,
              },
            ],
          },
          { backgroundColor: { red: 1, green: 0.9, blue: 0.75 } }
        )
      )
    if (col.delta !== undefined) {
      out.push(
        rule(
          [range(col.delta, col.delta + 1)],
          { type: 'NUMBER_LESS', values: [{ userEnteredValue: '0' }] },
          { textFormat: { foregroundColor: { red: 0.11, green: 0.45, blue: 0.2 }, bold: true } }
        )
      )
      out.push(
        rule(
          [range(col.delta, col.delta + 1)],
          { type: 'NUMBER_GREATER', values: [{ userEnteredValue: '0' }] },
          { textFormat: { foregroundColor: { red: 0.75, green: 0.3, blue: 0 }, bold: true } }
        )
      )
    }
    // A negative MC gap means the next segment starts before this one ends.
    if (col.mc !== undefined) {
      out.push(
        rule(
          [range(col.mc, col.mc + 1)],
          { type: 'NUMBER_LESS', values: [{ userEnteredValue: '0' }] },
          { textFormat: { foregroundColor: STATUS_COLOURS.CANCELLED.fg, bold: true } }
        )
      )
    }
    const noGo: [number | undefined, string][] = [
      [col.rec, REC_OFF],
      [col.streaming, 'NO STREAM'],
    ]
    for (const [c, text] of noGo) {
      if (c === undefined) continue
      out.push(
        rule(
          [range(c, c + 1)],
          { type: 'TEXT_EQ', values: [{ userEnteredValue: text }] },
          { backgroundColor: STATUS_COLOURS.CANCELLED.bg, textFormat: { foregroundColor: STATUS_COLOURS.CANCELLED.fg, bold: true } }
        )
      )
    }
  }
  for (const status of [...layout.statusOptions].reverse()) {
    const colour = STATUS_COLOURS[status]
    out.push(
      rule(
        [range(col.status!, col.status! + 1)],
        { type: 'TEXT_EQ', values: [{ userEnteredValue: status }] },
        { backgroundColor: colour.bg, textFormat: { foregroundColor: colour.fg, bold: true } }
      )
    )
  }
  return out
}

/** The merge addresses columns by position: recognise the template's header row or refuse to run. */
async function detectTemplateLayout(sheets: any): Promise<RosLayout> {
  const res: any = await withRetry('read template headers', () =>
    sheets.spreadsheets.values.get({ spreadsheetId: TEMPLATE_ID, range: `'${SHEET}'!A1:Z${TOP_ROWS}` })
  )
  const top: unknown[][] = res.data.values || []
  const layout = detectLayoutInRows(top)
  if (!layout) {
    const hints = LAYOUTS.map((l) => `${l.name} (row ${l.headerRow}): ${describeHeaderMismatch(top[l.headerRow - 1] || [], l)}`).join(' | ')
    throw new Error(`template headers match no known layout. ${hints}`)
  }
  return layout
}

// ---------------------------------------------------------------------------

function describe(plan: FilePlan): string {
  const s = plan.stats
  const parts: string[] = []
  if (s.added) parts.push(`${s.added} added`)
  if (s.changed) parts.push(`${s.changed} changed`)
  if (s.movedIn) parts.push(`${s.movedIn} moved in`)
  if (s.movedOut) parts.push(`${s.movedOut} moved out`)
  if (s.removed) parts.push(`${s.removed} removed`)
  return parts.length ? parts.join(' · ') : 'no changes'
}

async function main() {
  if (!ROS_ALLOWED_EVENTS.includes(eventId)) {
    throw new Error(`${eventId} is not in ROS_ALLOWED_EVENTS (${ROS_ALLOWED_EVENTS.join(', ')}); refusing to generate`)
  }
  if (!FOLDER_ID || !TEMPLATE_ID) {
    const folderVar = AV_TREE ? `AV_DRIVE_FOLDER_ID_${eventId.toUpperCase().replace(/-/g, '_')}` : 'ROS_FOLDER_ID'
    throw new Error(`${folderVar} and ROS_TEMPLATE_ID must be set`)
  }

  heading(`Run of show · ${eventId} · ${TZ}${DRY_RUN ? ' · DRY RUN (nothing written)' : ''}`)
  const sources = SOURCE === 'data' ? loadFromData() : await loadFromPretalx()
  const { rooms } = sources
  const talks = toRosSessions(sources)
  // Day numbers come from the whole event, so a filtered run names its folders like a full one.
  const days = [...new Set(talks.map((s) => s.day))].sort()
  const dayNumber = (day: string) => days.indexOf(day) + 1
  // Breaks and blockers join a stage's day that has talks; alone they never open a sheet.
  const withTalks = new Set(talks.map((s) => `${s.day}/${s.roomId}`))
  const blocks = toBlockSessions(sources.blocks, rooms, dayNumber).filter((b) => withTalks.has(`${b.day}/${b.roomId}`))
  const scheduled = [...talks, ...blocks]
  const wanted = (roomId: string, day: string) => (!ROOMS.length || ROOMS.includes(roomId)) && (!DAYS.length || DAYS.includes(dayNumber(day)))
  const sessions = scheduled.filter((s) => wanted(s.roomId, s.day))
  summary.sessions = sessions.length
  // "Slides (untouched)" from Drive itself on every run (one folder listing for all
  // decks); the Pretalx answer from the last slides run is only the fallback.
  const withDeck = sessions.filter((s) => !s.kind && deckIdFromUrl(s.slides))
  if (withDeck.length && SOURCE !== 'data') {
    try {
      const started = Date.now()
      const activity = await ListDeckActivity(withDeck.map((s) => deckIdFromUrl(s.slides)!))
      for (const s of withDeck) {
        const a = activity.get(deckIdFromUrl(s.slides)!)
        if (a) s.slidesUntouched = a.untouched
      }
      line(`deck activity read from Drive for ${activity.size} deck(s) in ${((Date.now() - started) / 1000).toFixed(1)}s`)
    } catch (e) {
      line(`! deck activity not read from Drive, using the last slides run: ${(e as Error).message}`)
    }
  }
  const limits = [ROOMS.length ? `rooms ${ROOMS.join(', ')}` : '', DAYS.length ? `day ${DAYS.join(', ')}` : ''].filter(Boolean)
  line(
    `${sessions.length} scheduled row(s) (${blocks.length} breaks and blockers in total) in ${rooms.length} room(s)${
      limits.length ? ` · limited to ${limits.join(' · ')}` : ''
    }${sources.version ? ` · schedule v${sources.version}` : ''}`
  )
  if (!sessions.length) {
    line('nothing scheduled, nothing to write')
    return
  }

  const files = new Map<string, StageFile>()
  for (const s of sessions) {
    const fileKey = `${s.day}/${s.roomId}`
    let f = files.get(fileKey)
    if (!f) {
      f = {
        day: s.day,
        roomId: s.roomId,
        roomName: s.roomName,
        label: `${s.roomName} · Day ${dayNumber(s.day)}`,
        fileKey,
        sessions: [],
        streamUrl: streamUrlFor(
          rooms.find((r) => r.id === s.roomId),
          dayNumber(s.day)
        ),
      }
      files.set(fileKey, f)
    }
    f.sessions.push(s)
  }

  // The CI workflows hold the credentials under ROS_GOOGLE_*; locally the shared GOOGLE_* pair is used.
  if (!process.env.GOOGLE_CLIENT_EMAIL && process.env.ROS_GOOGLE_CLIENT_EMAIL) {
    process.env.GOOGLE_CLIENT_EMAIL = process.env.ROS_GOOGLE_CLIENT_EMAIL
    process.env.GOOGLE_PRIVATE_KEY = process.env.ROS_GOOGLE_PRIVATE_KEY
  }
  const g = await AuthenticateServiceAccount(SCOPES)
  const drive = g.drive('v3')
  const sheets = g.sheets('v4')

  const folder: any = await withRetry('read folder', () => drive.files.get({ fileId: FOLDER_ID, supportsAllDrives: true, fields: 'id,name' }))
  const template: any = await withRetry('read template', () =>
    sheets.spreadsheets.get({ spreadsheetId: TEMPLATE_ID, fields: 'properties(title),sheets(properties(sheetId,title))' })
  )
  const templateSheetId = template.data.sheets.find((s: any) => s.properties.title === SHEET)?.properties.sheetId
  if (templateSheetId === undefined) throw new Error(`template has no "${SHEET}" tab`)
  const layout = await detectTemplateLayout(sheets)
  line(`folder "${folder.data.name}" · template "${template.data.properties.title}" (layout ${layout.name})`)
  const formatOptions = [...layout.formatOptions]
  for (const s of sessions) if (s.type && !formatOptions.includes(s.type)) formatOptions.push(s.type)

  heading('Drive')
  const roomFolders = new Set(ROOMS.map((id) => avRoomFolder(id, rooms.find((r) => r.id === id)?.name)))
  const { dayFolders, stageFiles } = await listManaged(drive, roomFolders)
  line(
    AV_TREE
      ? `AV tree: ${stageFiles.length} stage sheet(s) already managed`
      : `${dayFolders.length} day folder(s), ${stageFiles.length} stage sheet(s) already managed`
  )

  // Sheets that exist for a day/room no longer on the schedule still get a
  // pass, so their sessions are parked instead of silently going stale.
  for (const f of stageFiles) {
    const day = f.appProperties!.ros_day
    const roomId = f.appProperties!.ros_room
    // With a room or day allow-list, other sheets are left untouched.
    if (!wanted(roomId, day)) continue
    const fileKey = `${day}/${roomId}`
    let file = files.get(fileKey)
    if (!file) {
      const n = dayNumber(day)
      const roomName = rooms.find((r) => r.id === roomId)?.name || f.name
      file = { day, roomId, roomName, label: `${roomName} · ${n ? `Day ${n}` : day}`, fileKey, sessions: [] }
      files.set(fileKey, file)
    }
    // Two sheets for one stage and day: keep the older one, which holds the crew's work.
    if (file.drive && file.drive.id !== f.id) {
      const [keep, extra] = (file.drive.createdTime || '') <= (f.createdTime || '') ? [file.drive, f] : [f, file.drive]
      line(`! ${file.label}: two sheets, using the one created ${keep.createdTime?.slice(0, 10)}; the copy created ${extra.createdTime?.slice(0, 16)} is left alone (https://docs.google.com/spreadsheets/d/${extra.id})`)
      file.drive = keep
      continue
    }
    file.drive = f
  }
  const allDays = [...new Set([...files.values()].map((f) => f.day))].sort()
  // av-assets records every Drive file it made in its committed manifest; link the stage's QR image when it exists.
  const assetsPath = path.join(DATA_DIR, 'av-assets', `${eventId}.json`)
  const avFiles: Record<string, { driveId?: string }> = fs.existsSync(assetsPath) ? JSON.parse(fs.readFileSync(assetsPath, 'utf8')).files || {} : {}
  for (const f of files.values()) {
    const id = avFiles[qaQrKey(f.roomId)]?.driveId
    f.qaQr = id ? `https://drive.google.com/file/d/${id}/view` : `${qaQrUrl(f.roomId)}?svg&download`
  }

  heading('Reading')
  const ordered = [...files.values()].sort((a, b) => (a.day + a.roomName).localeCompare(b.day + b.roomName))
  const folderFor = new Map<string, DriveItem>()
  const sheetIds = new Map<string, SheetIds>()
  const layouts = new Map<string, RosLayout>()
  const existing = new Map<string, { rows: ExistingRow[]; rawCount: number }>()
  const fresh = new Set<string>()
  const numberOf = (day: string) => dayNumber(day) || allDays.indexOf(day) + 1
  if (!AV_TREE) for (const day of allDays) folderFor.set(day, await ensureDayFolder(drive, dayFolders, day, numberOf(day)))
  for (const file of ordered) {
    try {
      // A sheet that exists stays where the crew keeps it: folders are only made for a new one.
      const folder =
        AV_TREE && file.drive
          ? { id: file.drive.parents?.[0] || '', name: file.label, mimeType: FOLDER_MIME }
          : AV_TREE
          ? await ensureAvFolder(drive, file, numberOf(file.day))
          : folderFor.get(file.day)!
      const { item, created } = await ensureStageFile(drive, file, folder, stageFileName(file, numberOf(file.day)))
      if (!item) {
        line(`? ${file.label}: would be created from the template`)
        existing.set(file.fileKey, { rows: [], rawCount: 0 })
        continue
      }
      file.drive = item
      const fileLayout = created ? layout : await readSheetLayout(sheets, item.id, file.label)
      if (!fileLayout) throw new Error(`headers match no known layout; the sheet is skipped`)
      layouts.set(file.fileKey, fileLayout)
      sheetIds.set(file.fileKey, await prepareSheets(sheets, item.id, templateSheetId, file.label, created, fileLayout, LAYOUT_IO[fileLayout.name]))
      const read = await readExisting(sheets, item.id, fileLayout, file.fileKey, file.label)
      // A fresh copy still holds the template's example rows; they are not the AV team's.
      if (created) fresh.add(file.fileKey)
      existing.set(file.fileKey, created ? { rows: [], rawCount: read.rawCount } : read)
    } catch (e: any) {
      problem(`${file.label}: ${e.message}`)
    }
  }
  const allRows = [...existing.values()].flatMap((e) => e.rows)
  const index = buildIndex(allRows)
  const locationOf = new Map<string, { fileKey: string; label: string }>()
  for (const f of files.values()) for (const s of f.sessions) locationOf.set(s.code, { fileKey: f.fileKey, label: f.label })
  line(`${allRows.length} existing keyed row(s) across ${existing.size} sheet(s)`)

  const runLabel = `${dayjs().tz(TZ).format('YYYY-MM-DD HH:mm')} ${TZ}`
  heading(DRY_RUN ? 'Plan' : 'Writing')
  for (const file of ordered) {
    const ex = existing.get(file.fileKey)
    if (!ex) continue
    const ids = sheetIds.get(file.fileKey)
    const fileLayout = layouts.get(file.fileKey) || layout
    const plan = planFile({
      layout: fileLayout,
      fileKey: file.fileKey,
      label: file.label,
      sessions: file.sessions,
      existingRows: ex.rows,
      index,
      locationOf,
      firstSheetRow: firstRow(fileLayout),
      initial: fresh.has(file.fileKey),
      cuesGid: ids?.cues,
    })
    summary.changes += plan.changes.length
    const marker = plan.changes.length ? (ex.rows.length ? '~' : '+') : '='
    line(`${marker} ${file.label}: ${file.sessions.length} session(s) · ${describe(plan)}`)
    if (DRY_RUN) {
      for (const c of plan.changes.slice(0, 20)) line(`    ${c.field} [${c.code}] ${c.title}: ${c.from} → ${c.to}`)
      if (plan.changes.length > 20) line(`    … ${plan.changes.length - 20} more`)
      continue
    }
    if (!ids || !file.drive) continue
    try {
      const result = await writeFile(
        sheets,
        file.drive.id,
        fileLayout,
        LAYOUT_IO[fileLayout.name],
        ids,
        file,
        dayNumber(file.day),
        plan,
        ex.rawCount,
        runLabel,
        formatOptions,
        sources.version
      )
      if (!result.written) {
        summary.filesSkipped++
        continue
      }
      summary.filesWritten++
      // Remember what was sent, so the next run can skip the sheet while nothing differs.
      await withRetry(`stamp ${file.label}`, () =>
        drive.files.update({ fileId: file.drive!.id, supportsAllDrives: true, requestBody: { appProperties: { ros_hash: result.fingerprint } } })
      )
    } catch (e: any) {
      problem(`${file.label}: ${e.message}`)
    }
  }

  const secs = Math.round((Date.now() - startedAt) / 1000)
  heading(
    `Done in ${secs}s · ${summary.sessions} sessions · ${summary.filesCreated} sheet(s) created · ${summary.filesWritten} written · ${summary.filesSkipped} unchanged · ${summary.changes} change(s) logged`
  )
  line(`https://drive.google.com/drive/folders/${FOLDER_ID}`)
  if (PROFILE) {
    heading('time per kind of Google call (retries included)')
    for (const [kind, p] of [...profile].sort((a, b) => b[1].ms - a[1].ms))
      line(`${(p.ms / 1000).toFixed(1).padStart(6)}s  ${String(p.calls).padStart(3)}×  ${kind}`)
  }
  if (problems.length) {
    heading(`${problems.length} problem(s):`)
    for (const p of problems) line(`✗ ${p}`)
    process.exitCode = 1
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(process.exitCode || 0))
    .catch((e) => {
      console.error(`\n✗ ${e.message || e}`)
      process.exit(1)
    })
}
