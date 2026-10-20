// Second half of the hourly Community Hubs live export
// (.github/workflows/fileverse-live-export.yml). The first half,
// .github/scripts/fileverse-live-export.mjs, opens every hub sheet's edit link
// in a headless browser and dumps the Yjs updates the editor keeps, one
// `<hub id>.json` per hub: { dsheetId, updates: [base64...] } or { error }.
// This turns them into cells and writes data/community-hubs/sheets.json, which
// the API reads from GitHub. A hub that failed keeps its previous cells (with
// the error noted); a hub no longer in the secret drops out. The file is only
// rewritten when cells changed, or every HEARTBEAT_MS so a stalled export
// shows on the status endpoint. Alongside it, data/community-hubs/<event>-sessions.json
// holds the same sheets parsed into sessions (what the app shows), with no
// per-read timestamps, so each commit's diff reads as "this session changed".
// Run with `pnpm community-hubs:live <dump dir>`.
import fs from 'fs'
import path from 'path'
import { readTabsFromUpdates } from '@/clients/fileverse'
import {
  COMMUNITY_HUBS,
  LIVE_HUB_SHEETS_PATH,
  eventDays,
  eventUtcOffsetMinutes,
  parseHubSheets,
  type LiveHubSheet,
  type LiveHubSheets,
} from '@/utils/community-hubs'

const HEARTBEAT_MS = 6 * 60 * 60_000
const OUT = path.join(__dirname, '..', '..', '..', LIVE_HUB_SHEETS_PATH)
/** The hubs run at Devcon 8; the readable file is parsed against its days. */
const EVENT_ID = 'devcon8'
const READABLE_OUT = path.join(path.dirname(OUT), `${EVENT_ID}-sessions.json`)

interface Dump {
  dsheetId?: string
  updates?: string[]
  error?: string
}

function main() {
  const dir = process.argv[2]
  if (!dir) throw new Error('usage: community-hubs-live <dump dir>')
  const now = Date.now()
  let previous: LiveHubSheets = { exportedAt: 0, hubs: {} }
  try {
    previous = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  } catch {
    // First export.
  }

  const hubs: Record<string, LiveHubSheet> = {}
  let read = 0
  for (const hub of COMMUNITY_HUBS) {
    const file = path.join(dir, `${hub.id}.json`)
    if (!fs.existsSync(file)) continue
    const dump: Dump = JSON.parse(fs.readFileSync(file, 'utf8'))
    const prev = previous.hubs[hub.id]
    let tabs: LiveHubSheet['tabs'] | null = null
    let error = dump.error
    if (!error) {
      try {
        if (!dump.dsheetId || !dump.updates?.length) throw new Error('no live data in the dump')
        tabs = readTabsFromUpdates(dump.dsheetId, dump.updates.map((u) => new Uint8Array(Buffer.from(u, 'base64'))))
        if (!tabs.some((t) => t.cells.length)) throw new Error('the live document has no cells')
      } catch (e) {
        error = e instanceof Error ? e.message : String(e)
        tabs = null
      }
    }
    if (tabs) {
      read++
      const same = prev && !prev.error && JSON.stringify(prev.tabs) === JSON.stringify(tabs)
      hubs[hub.id] = { changedAt: same ? prev.changedAt : now, tabs }
      const cells = tabs.reduce((n, t) => n + t.cells.length, 0)
      console.log(`${hub.id}: ${cells} cells in ${tabs.length} tab(s)${same ? ', unchanged' : ', CHANGED'}`)
    } else {
      hubs[hub.id] = { changedAt: prev?.changedAt ?? 0, tabs: prev?.tabs ?? [], error }
      console.warn(`${hub.id}: FAILED (${error}), ${prev?.tabs.length ? 'keeping the previous export' : 'nothing to keep'}`)
    }
  }
  if (read === 0) throw new Error('no hub sheet could be read, leaving the file as it is')

  const changed = JSON.stringify(hubs) !== JSON.stringify(previous.hubs)
  if (!changed && now - previous.exportedAt < HEARTBEAT_MS) {
    console.log('nothing changed, file left as it is')
    return
  }
  const next: LiveHubSheets = { exportedAt: now, hubs }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(next, null, 1) + '\n')
  writeReadable(hubs)
  console.log(changed ? `wrote ${OUT}` : `wrote ${OUT} (heartbeat, no cell changes)`)
}

/** The sheets as the API parses them, one entry per session in local (event) time: for reading diffs, not read by the API. */
export function writeReadable(hubs: Record<string, LiveHubSheet>) {
  const event = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'events', `${EVENT_ID}.json`), 'utf8'))
  const days = eventDays(event.startDate, event.endDate)
  const offset = eventUtcOffsetMinutes(EVENT_ID)
  const clock = (ms: number) => new Date(ms + offset * 60_000).toISOString().slice(11, 16)
  // "Tue 3 Nov", as the sheets' Day column reads.
  const dayLabel = (d: { year: number; month: number; day: number }) => {
    const date = new Date(Date.UTC(d.year, d.month - 1, d.day))
    return `${date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })} ${d.day} ${date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}`
  }
  const readable = COMMUNITY_HUBS.filter((hub) => hubs[hub.id]).map((hub) => {
    const live = hubs[hub.id]
    const parsed = parseHubSheets({ dsheetId: hub.id, tabs: live.tabs, publishedAt: live.changedAt }, days, offset)
    return {
      hub: hub.name,
      changedAt: new Date(live.changedAt).toISOString(),
      ...(live.error ? { exportError: live.error } : {}),
      problems: parsed.problems,
      sessions: parsed.sessions.map((row) => ({
        id: row.key,
        day: dayLabel(row.day),
        time: `${clock(row.start)}-${clock(row.end)}`,
        title: row.title,
        ...(row.format ? { format: row.format } : {}),
        speakers: row.speakers,
        ...(row.topic ? { topic: row.topic } : {}),
        ...(row.description ? { description: row.description } : {}),
      })),
    }
  })
  fs.writeFileSync(READABLE_OUT, JSON.stringify(readable, null, 2) + '\n')
  console.log(`wrote ${READABLE_OUT}`)
}

if (require.main === module) main()
