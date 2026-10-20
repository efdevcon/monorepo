// Run of show for the AV team: one Google Sheet per day and stage, copied from
// the AV team's own template and then kept in sync with the Pretalx schedule.
//
// The template's header row tells the script which layout it is (the original AV
// template, the v2 proposal, or v3, the AV team's revision of it). Only the schedule columns and the PRETALX ID key
// are ever rewritten. The crew's columns travel with the session, keyed by its
// Pretalx code, when it moves within a sheet, to another stage or to another day.
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
import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { AuthenticateServiceAccount } from '@/clients/google'
import { GetRooms, GetSessions, GetSpeakers } from '@/clients/pretalx'
import { getPretalxConfig } from '@/utils/config'
import { AV_EVENT_FOLDER, avDayFolder, avRoomFolder, qaQrKey, qaQrUrl } from '@/utils/av-drive'
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
} from '@/utils/run-of-show'

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
  /** Ranges emptied once when a sheet is created: the template's example content. */
  templateClears: string[]
  /** After a shrink, rows below the footer: reset to default (v1) or re-apply the tinted data style (v2). */
  leftover: 'clear' | 'style'
  /** Cell holding the stage's stream link, if the layout has one. */
  streamCell?: string
  /** Tab listing the AV team's digital assets: the sync fills only the Link (B) of the row whose name matches. */
  assets?: { tab: string; qaQrRow: RegExp }
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
  // Template rows: 1 DAY / STAGE, 2 headers, 3.. examples, then a REMOVED divider and a parked example.
  v3: {
    style: { divider: 8, dataEven: 2, dataOdd: 2 },
    dayCell: 'B1',
    dayBand: false,
    stageCell: 'C1',
    assets: { tab: 'Digital Assets', qaQrRow: /^q\s*&\s*a\s+qr/i },
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
const summary = { filesCreated: 0, filesWritten: 0, sessions: 0, changes: 0 }
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
/** Google quotas are per minute; back off on 429/5xx instead of failing the run. */
async function withRetry<T>(what: string, fn: () => Promise<T>, attempts = 6): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn()
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
  const [sessions, rooms, speakers] = await Promise.all([
    GetSessions({}, config) as Promise<RawSession[]>,
    GetRooms(config) as Promise<Room[]>,
    // Contacts are for the stage crew's sheet only; they never reach the public data.
    GetSpeakers({ inclContacts: true }, config) as Promise<any[]>,
  ])
  return { sessions, rooms, ...indexSpeakers(speakers) }
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
  return { sessions, rooms, ...indexSpeakers(readJsonDir<any>(path.join(DATA_DIR, 'speakers'))) }
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

async function listChildren(drive: any, parentId: string): Promise<DriveItem[]> {
  const items: DriveItem[] = []
  let pageToken: string | undefined
  do {
    const res: any = await withRetry('list folder', () =>
      drive.files.list({
        q: `'${parentId}' in parents and trashed=false`,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageSize: 200,
        pageToken,
        fields: 'nextPageToken,files(id,name,mimeType,parents,appProperties)',
      })
    )
    items.push(...(res.data.files || []))
    pageToken = res.data.nextPageToken
  } while (pageToken)
  return items
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
 * With a room allow-list only those rooms' folders are opened.
 */
async function listAvTree(drive: any, roomFolders: Set<string>): Promise<DriveItem[]> {
  const isFolder = (f: DriveItem) => f.mimeType === FOLDER_MIME
  const event = (await listChildren(drive, FOLDER_ID!)).find((f) => isFolder(f) && f.name === AV_EVENT_FOLDER)
  if (!event) return []
  const found: DriveItem[] = []
  for (const room of (await listChildren(drive, event.id)).filter(isFolder)) {
    if (ROOMS.length && !roomFolders.has(room.name)) continue
    for (const day of (await listChildren(drive, room.id)).filter(isFolder)) {
      found.push(...(await listChildren(drive, day.id)).filter((f) => f.mimeType === 'application/vnd.google-apps.spreadsheet' && mine(f, 'stage')))
    }
  }
  return found
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
  rowCount: number
  columnCount: number
  /** Conditional format rules currently on the tab; the v1 sync replaces them by the STATUS colours. */
  conditionalRules: number
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
      fields: 'sheets(properties(sheetId,title,index,gridProperties(rowCount,columnCount)),conditionalFormats(ranges))',
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
    rowCount: grid.rowCount ?? 0,
    columnCount: grid.columnCount ?? 0,
    conditionalRules: (mainTab.conditionalFormats || []).length,
  }
}

/** A sheet keeps working with the layout it was created from, even if the template changes later. */
async function readSheetLayout(sheets: any, spreadsheetId: string, label: string): Promise<RosLayout | null> {
  const res: any = await withRetry(`read headers of ${label}`, () =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: `'${SHEET}'!A1:Z${TOP_ROWS}` })
  )
  return detectLayoutInRows(res.data.values || [])
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
  const res: any = await withRetry(`read rows of ${label}`, () =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: `'${SHEET}'!A${first}:${last}`, valueRenderOption: 'FORMATTED_VALUE' })
  )
  // Link columns (SLIDES, Q&A QR) hold HYPERLINK formulas; compare and carry the URL, not the label.
  const formulas: any = await withRetry(`read links of ${label}`, () =>
    sheets.spreadsheets.values.get({ spreadsheetId, range: `'${SHEET}'!A${first}:${last}`, valueRenderOption: 'FORMULA' })
  )
  const raw: any[][] = res.data.values || []
  const cells: any[][] = formulas.data.values || []
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

function formatRequests(layout: RosLayout, io: LayoutIo, ids: SheetIds, plan: FilePlan, span: number, formatOptions: string[]): any[] {
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
  if (col.rec !== undefined) requests.push({ setDataValidation: { range: dataRange(col.rec), rule: list(['REC', 'NO REC']) } })
  if (col.streaming !== undefined) requests.push({ setDataValidation: { range: dataRange(col.streaming), rule: list(['STREAM', 'NO STREAM']) } })
  for (const f of layout.checkboxes) {
    requests.push({ setDataValidation: { range: dataRange(col[f]!), rule: { condition: { type: 'BOOLEAN' }, showCustomUi: true } } })
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
  formatOptions: string[]
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
  await withRetry(`prepare ${file.label}`, () => sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: structure } }))

  const values = plan.rows.map((r) => {
    const v: (string | number)[] = new Array(cols).fill('')
    r.values.forEach((x, i) => (v[i] = x))
    return v
  })
  const data: any[] = [
    {
      range: `'${SHEET}'!${io.dayCell}`,
      values: [[io.stageCell ? shortDayCell(file.day, dayNumber) : dayLabelCell(file.day, dayNumber, file.roomName)]],
    },
    { range: `'${SHEET}'!A${first}:${last}${first + n - 1}`, values },
  ]
  if (io.stageCell) data.push({ range: `'${SHEET}'!${io.stageCell}`, values: [[file.roomName]] })
  if (io.assets && file.qaQr) {
    // The AV team owns the tab and its order; only the Link cell of the "Q&A QR code" row is ours.
    const names: any = await withRetry(`read ${io.assets.tab} of ${file.label}`, () =>
      sheets.spreadsheets.values.get({ spreadsheetId, range: `'${io.assets!.tab}'!A1:A200` })
    ).catch(() => null)
    const at = (names?.data.values || []).findIndex((r: any[]) => io.assets!.qaQrRow.test(String(r[0] ?? '')))
    if (at >= 0) data.push({ range: `'${io.assets.tab}'!B${at + 1}`, values: [[`=HYPERLINK("${file.qaQr}","Q&A QR · ${file.roomName}")`]] })
    else line(`! ${file.label}: no "Q&A QR code" row on ${io.assets.tab}, link not written`)
  }
  if (!layout.keyInTemplate) data.push({ range: `'${SHEET}'!${last}${layout.headerRow}`, values: [[layout.headers[cols - 1]]] })
  if (io.streamCell) {
    data.push({ range: `'${SHEET}'!${io.streamCell}`, values: [[file.streamUrl ? `=HYPERLINK("${file.streamUrl}","▶ Live stream")` : '']] })
  }
  await withRetry(`write rows of ${file.label}`, () =>
    sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: 'USER_ENTERED', data } })
  )
  await withRetry(`format ${file.label}`, () =>
    sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: formatRequests(layout, io, ids, plan, span, formatOptions) } })
  )
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
      [col.rec, 'NO REC'],
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
  const scheduled = toRosSessions(sources)
  // Day numbers come from the whole event, so a filtered run names its folders like a full one.
  const days = [...new Set(scheduled.map((s) => s.day))].sort()
  const dayNumber = (day: string) => days.indexOf(day) + 1
  const wanted = (roomId: string, day: string) => (!ROOMS.length || ROOMS.includes(roomId)) && (!DAYS.length || DAYS.includes(dayNumber(day)))
  const sessions = scheduled.filter((s) => wanted(s.roomId, s.day))
  summary.sessions = sessions.length
  const limits = [ROOMS.length ? `rooms ${ROOMS.join(', ')}` : '', DAYS.length ? `day ${DAYS.join(', ')}` : ''].filter(Boolean)
  line(`${sessions.length} scheduled session(s) in ${rooms.length} room(s)${limits.length ? ` · limited to ${limits.join(' · ')}` : ''}`)
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
      const folder = AV_TREE ? await ensureAvFolder(drive, file, numberOf(file.day)) : folderFor.get(file.day)!
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
      await writeFile(
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
        formatOptions
      )
      summary.filesWritten++
    } catch (e: any) {
      problem(`${file.label}: ${e.message}`)
    }
  }

  const secs = Math.round((Date.now() - startedAt) / 1000)
  heading(
    `Done in ${secs}s · ${summary.sessions} sessions · ${summary.filesCreated} sheet(s) created · ${summary.filesWritten} written · ${summary.changes} change(s) logged`
  )
  line(`https://drive.google.com/drive/folders/${FOLDER_ID}`)
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
