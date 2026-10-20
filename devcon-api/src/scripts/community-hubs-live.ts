// Second half of the hourly Community Hubs live export
// (.github/workflows/fileverse-live-export.yml). The first half,
// .github/scripts/fileverse-live-export.mjs, opens every hub sheet's edit link
// in a headless browser and dumps the Yjs updates the editor keeps, one
// `<hub id>.json` per hub: { dsheetId, updates: [base64...] } or { error }.
// This turns them into cells and writes data/community-hubs/sheets.json, which
// the API reads from GitHub. A hub that failed keeps its previous cells (with
// the error noted); a hub no longer in the secret drops out. The file is only
// rewritten when cells changed, or every HEARTBEAT_MS so a stalled export
// shows on the status endpoint. Run with `pnpm community-hubs:live <dump dir>`.
import fs from 'fs'
import path from 'path'
import { readTabsFromUpdates } from '@/clients/fileverse'
import { COMMUNITY_HUBS, LIVE_HUB_SHEETS_PATH, type LiveHubSheet, type LiveHubSheets } from '@/utils/community-hubs'

const HEARTBEAT_MS = 6 * 60 * 60_000
const OUT = path.join(__dirname, '..', '..', '..', LIVE_HUB_SHEETS_PATH)

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
  console.log(changed ? `wrote ${OUT}` : `wrote ${OUT} (heartbeat, no cell changes)`)
}

main()
