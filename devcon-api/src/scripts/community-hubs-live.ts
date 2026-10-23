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
// Run with `pnpm community-hubs:live <dump dir>`.
import fs from 'fs'
import path from 'path'
import { readTabsFromUpdates } from '@/clients/fileverse'
import {
  COMMUNITY_HUBS,
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
import { defaultSlugify } from '@/utils/content'
import { mirrorAvatar } from '@/services/avatar-mirror'

const HEARTBEAT_MS = 6 * 60 * 60_000
const OUT = path.join(__dirname, '..', '..', '..', LIVE_HUB_SHEETS_PATH)
/** The hubs run at Devcon 8; the readable file is parsed against its days. */
const EVENT_ID = 'devcon8'
const READABLE_OUT = path.join(path.dirname(OUT), `${EVENT_ID}-sessions.json`)
const SPEAKERS_OUT = path.join(__dirname, '..', '..', '..', HUB_SPEAKER_PHOTOS_PATH)

interface Dump {
  dsheetId?: string
  updates?: string[]
  error?: string
}

async function main() {
  const dir = process.argv[2]
  if (!dir) throw new Error('usage: community-hubs-live <dump dir>')
  const now = Date.now()
  await writeSpeakerPhotos(dir, now)
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

/**
 * The shared speaker sheet, resolved: one entry per name slug with the
 * mirrored photo and socials. Mirroring is idempotent (keyed by source URL),
 * so an hourly run costs one HEAD per photo. A dump that failed, or no dump
 * at all (no `speakers` entry in the secret), leaves the previous file alone.
 */
async function writeSpeakerPhotos(dir: string, now: number) {
  const file = path.join(dir, `${COMMUNITY_HUB_SPEAKERS_SHEET_ID}.json`)
  if (!fs.existsSync(file)) return
  const dump: Dump = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (dump.error || !dump.dsheetId || !dump.updates?.length) {
    console.warn(`speakers: FAILED (${dump.error ?? 'no live data in the dump'}), keeping the previous file`)
    return
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
    return
  }
  const next: HubSpeakerPhotos = { exportedAt: now, speakers: sorted, problems }
  fs.mkdirSync(path.dirname(SPEAKERS_OUT), { recursive: true })
  fs.writeFileSync(SPEAKERS_OUT, JSON.stringify(next, null, 1) + '\n')
  console.log(`speakers: wrote ${SPEAKERS_OUT} (${Object.keys(speakers).length} entries, ${problems.length} problem(s))`)
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

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
