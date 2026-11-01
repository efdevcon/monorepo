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
// The shared speaker sheet (secret id COMMUNITY_HUB_SPEAKERS_SHEET_ID) is read
// the same way into data/community-hubs/speaker-photos.json, with every photo
// mirrored into our avatar bucket (SUPABASE_URL / SUPABASE_KEY; without them
// the source links are kept as they are).
// A hub whose programme arrives as a file (`source: 'csv'` in COMMUNITY_HUBS)
// has no dump: its cells are built from data/community-hubs/csv/<hub id>.csv
// on every run (utils/community-hubs-csv.ts). `pnpm community-hubs:csv`
// (--csv-only, no dump dir) rebuilds those hubs alone and keeps every sheet
// hub as committed, for a new file without a browser export.
// Run with `pnpm community-hubs:live <dump dir>`.
// Local runs read the Supabase keys from .env (CI passes them as env vars);
// without them every mirrored photo would fall back to its source link.
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { readTabsFromUpdates } from '@/clients/fileverse'
import {
  COMMUNITY_HUBS,
  COMMUNITY_HUB_CSV_DIR,
  COMMUNITY_HUB_SPEAKERS_SHEET_ID,
  HUB_SPEAKER_PHOTOS_PATH,
  LIVE_HUB_SHEETS_PATH,
  avatarSourceFor,
  eventDays,
  eventUtcOffsetMinutes,
  parseHubSheets,
  parseSocial,
  parseSpeakerSheet,
  type HubSpeakerExtra,
  type HubSpeakerPhotos,
  type LiveHubSheet,
  type LiveHubSheets,
} from '@/utils/community-hubs'
import { csvToHubTab } from '@/utils/community-hubs-csv'
import { defaultSlugify } from '@/utils/content'
import { mirrorAvatar } from '@/services/avatar-mirror'

const HEARTBEAT_MS = 6 * 60 * 60_000
const OUT = path.join(__dirname, '..', '..', '..', LIVE_HUB_SHEETS_PATH)
/** The hubs run at Devcon 8; the readable file is parsed against its days. */
const EVENT_ID = 'devcon8'
const READABLE_OUT = path.join(path.dirname(OUT), `${EVENT_ID}-sessions.json`)
const SPEAKERS_OUT = path.join(__dirname, '..', '..', '..', HUB_SPEAKER_PHOTOS_PATH)
const CSV_DIR = path.join(__dirname, '..', '..', '..', COMMUNITY_HUB_CSV_DIR)

interface Dump {
  dsheetId?: string
  updates?: string[]
  error?: string
}

async function main() {
  const args = process.argv.slice(2)
  const csvOnly = args.includes('--csv-only')
  const dir = args.find((a) => !a.startsWith('--'))
  if (!dir && !csvOnly) throw new Error('usage: community-hubs-live <dump dir> | community-hubs-live --csv-only')
  const now = Date.now()
  const speakersChanged = dir ? await writeSpeakerPhotos(dir, now) : false
  let previous: LiveHubSheets = { exportedAt: 0, hubs: {} }
  try {
    previous = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  } catch {
    // First export.
  }

  // A CSV-only run rebuilds the hubs whose programme is a file and keeps every sheet hub as committed.
  const hubs: Record<string, LiveHubSheet> = csvOnly ? { ...previous.hubs } : {}
  let read = 0
  for (const hub of COMMUNITY_HUBS) {
    const prev = previous.hubs[hub.id]
    let tabs: LiveHubSheet['tabs'] | null = null
    let error: string | undefined
    if (hub.source === 'csv') {
      try {
        tabs = [csvToHubTab(hub.name, fs.readFileSync(path.join(CSV_DIR, `${hub.id}.csv`), 'utf8'))]
      } catch (e) {
        error = e instanceof Error ? e.message : String(e)
      }
    } else {
      if (csvOnly) continue
      const file = path.join(dir!, `${hub.id}.json`)
      if (!fs.existsSync(file)) continue
      const dump: Dump = JSON.parse(fs.readFileSync(file, 'utf8'))
      error = dump.error
      if (!error) {
        try {
          if (!dump.dsheetId || !dump.updates?.length) throw new Error('no live data in the dump')
          tabs = readTabsFromUpdates(
            dump.dsheetId,
            dump.updates.map((u) => new Uint8Array(Buffer.from(u, 'base64')))
          )
          if (!tabs.some((t) => t.cells.length)) throw new Error('the live document has no cells')
        } catch (e) {
          error = e instanceof Error ? e.message : String(e)
          tabs = null
        }
      }
    }
    const source = hub.source === 'csv' ? { source: 'csv' as const } : {}
    if (tabs) {
      read++
      const same = prev && !prev.error && JSON.stringify(prev.tabs) === JSON.stringify(tabs)
      hubs[hub.id] = { changedAt: same ? prev.changedAt : now, tabs, ...source }
      const cells = tabs.reduce((n, t) => n + t.cells.length, 0)
      console.log(
        `${hub.id}: ${cells} cells in ${tabs.length} tab(s)${same ? ', unchanged' : ', CHANGED'}${hub.source === 'csv' ? ' (from the repo CSV)' : ''}`
      )
    } else {
      hubs[hub.id] = { changedAt: prev?.changedAt ?? 0, tabs: prev?.tabs ?? [], ...source, error }
      console.warn(`${hub.id}: FAILED (${error}), ${prev?.tabs.length ? 'keeping the previous export' : 'nothing to keep'}`)
    }
  }
  if (read === 0) throw new Error('no hub programme could be read, leaving the file as it is')

  const changed = JSON.stringify(hubs) !== JSON.stringify(previous.hubs)
  if (!changed && !speakersChanged && (csvOnly || now - previous.exportedAt < HEARTBEAT_MS)) {
    console.log('nothing changed, file left as it is')
    return
  }
  // One more release for any content change (cells or speaker photos); a
  // heartbeat rewrite keeps the number. A CSV-only run read no sheet, so it
  // leaves exportedAt (the sheet export's own freshness) where it was.
  const release = (previous.release ?? 0) + (changed || speakersChanged ? 1 : 0)
  const next: LiveHubSheets = { exportedAt: csvOnly ? previous.exportedAt || now : now, release, hubs }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(next, null, 1) + '\n')
  writeReadable(hubs)
  console.log(changed || speakersChanged ? `wrote ${OUT} (release v${release})` : `wrote ${OUT} (heartbeat, no content changes, release v${release})`)
}

/**
 * The shared speaker sheet, resolved: one entry per name slug with the
 * mirrored photo and socials. Mirroring is idempotent (keyed by source URL),
 * so an hourly run costs one HEAD per photo. A dump that failed, or no dump
 * at all (no `speakers` entry in the secret), leaves the previous file alone.
 * Returns whether the file was rewritten.
 */
async function writeSpeakerPhotos(dir: string, now: number): Promise<boolean> {
  const file = path.join(dir, `${COMMUNITY_HUB_SPEAKERS_SHEET_ID}.json`)
  if (!fs.existsSync(file)) return false
  const dump: Dump = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (dump.error || !dump.dsheetId || !dump.updates?.length) {
    console.warn(`speakers: FAILED (${dump.error ?? 'no live data in the dump'}), keeping the previous file`)
    return false
  }
  const tabs = readTabsFromUpdates(
    dump.dsheetId,
    dump.updates.map((u) => new Uint8Array(Buffer.from(u, 'base64')))
  )
  const parsed = parseSpeakerSheet(tabs)
  const problems = [...parsed.problems]
  const canMirror = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY)
  if (!canMirror) problems.push('photos not mirrored (SUPABASE_URL / SUPABASE_KEY not set): the source links are served as they are')

  const speakers: Record<string, HubSpeakerExtra> = {}
  let blank = 0
  for (const row of parsed.rows) {
    const slug = defaultSlugify(row.name)
    if (!slug) continue
    if (speakers[slug]) {
      problems.push(`row ${row.line} "${row.name}": already listed above, this row is ignored`)
      continue
    }
    if (!row.photo && !row.social) blank++
    const social = parseSocial(row.social)
    if (row.social && !social.twitter && !social.github && !social.website)
      problems.push(`row ${row.line} "${row.name}": social "${row.social}" is not a link or a handle`)
    const extra: HubSpeakerExtra = { name: row.name, ...social }
    const source = avatarSourceFor(row.photo, social)
    if (source) {
      try {
        extra.avatar = canMirror ? await mirrorAvatar(source) : source
      } catch (e) {
        problems.push(`row ${row.line} "${row.name}": photo could not be fetched (${e instanceof Error ? e.message : String(e)})`)
      }
    }
    speakers[slug] = extra
  }
  if (blank > 0) problems.push(`${blank} speaker${blank === 1 ? '' : 's'} without a photo or a social link yet`)
  // Alphabetical whatever the sheet's order, so a commit's diff shows the row that changed.
  const sorted = Object.fromEntries(Object.entries(speakers).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })))

  let previous: HubSpeakerPhotos | null = null
  try {
    previous = JSON.parse(fs.readFileSync(SPEAKERS_OUT, 'utf8'))
  } catch {
    // First export.
  }
  const same =
    previous && JSON.stringify(previous.speakers) === JSON.stringify(sorted) && JSON.stringify(previous.problems) === JSON.stringify(problems)
  // No heartbeat rewrite here: the file's exportedAt is part of the bundle
  // version the app polls, so it must only move when the content does.
  if (same) {
    console.log(`speakers: ${Object.keys(speakers).length} entries, unchanged`)
    return false
  }
  const next: HubSpeakerPhotos = { exportedAt: now, speakers: sorted, problems }
  fs.mkdirSync(path.dirname(SPEAKERS_OUT), { recursive: true })
  fs.writeFileSync(SPEAKERS_OUT, JSON.stringify(next, null, 1) + '\n')
  console.log(`speakers: wrote ${SPEAKERS_OUT} (${Object.keys(speakers).length} entries, ${problems.length} problem(s))`)
  return true
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
    return `${date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })} ${d.day} ${date.toLocaleDateString('en-GB', {
      month: 'short',
      timeZone: 'UTC',
    })}`
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
        // The sheet's ID; a keyless row (a CSV without an ID column) is known by its title's slug.
        id: row.key || defaultSlugify(row.title),
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

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
