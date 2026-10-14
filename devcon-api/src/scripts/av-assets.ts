/**
 * AV asset pack for an event: a 1920x1080 intro card per session (the AV card
 * devcon.org renders for YouTube) and each speaker's photo in the best quality
 * Pretalx holds, laid out in the AV team's Drive folder the way a room operator
 * works: cards by room and day, named by start time, photos in one folder.
 *
 *   pnpm av:assets devcon8                         # build the local tree, report what would change
 *   pnpm av:assets devcon8 --upload                # also sync the AV Drive folder
 *   pnpm av:assets devcon8 --rooms lotus-1,cls-stage   # limit to some rooms (never trashes anything)
 *
 * Local output: devcon-api/.av-assets/<event>/ (gitignored), mirroring Drive:
 *   $$EVENT/<Room>/<Day N - Mon D>/Intro Cards/HH.MM <Title> [CODE].jpg   intro card
 *   Speaker Assets/Photos/<Speaker Name> [CODE].jpg   up to 1024 px
 *   Speaker Assets/Photos/<Speaker Name> [CODE] (256px only).jpg  photo gone from Pretalx, our small mirror
 *   Speaker Assets/Photos/<Speaker Name> [CODE] (blockie).png     no photo at all
 *   Speaker Assets/Photos/_speakers without photo        a Google Doc, rewritten in place
 *
 * Drive: the shared drive labels anything the robot uploads from outside and the
 * label hides the file from the robot itself (it can neither list, update nor
 * trash it afterwards). An in-drive copy of a file labelled Public inherits
 * Public and keeps it when its bytes are replaced. So every new file starts as
 * a copy of a seed image that a human placed in the photos folder and labelled
 * Public (SEED_NAME), and gets its real content written over it. The robot then
 * owns the file for good. The manifest data/av-assets/<event>.json (committed,
 * so the CI run after each schedule release sees it) keys every file by what it
 * is (card of session X, photo of speaker Y), not by its path: a rescheduled
 * session's card is moved and renamed, a changed one is rewritten in place
 * (same id, same link), a stale one is trashed. Folders are not labelled, so
 * missing room, day or "Intro Cards" folders are created on the way.
 *
 * Env: AV_DRIVE_FOLDER_ID_<EVENT> (the AV top folder), GOOGLE_CLIENT_EMAIL and
 * GOOGLE_PRIVATE_KEY (the service account, granted access to that folder).
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { Readable } from 'stream'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import sharp from 'sharp'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import { getPretalxConfig } from '@/utils/config'

dayjs.extend(utc)
dayjs.extend(timezone)

const eventId = process.argv[2]
const UPLOAD = process.argv.includes('--upload')
const roomsArg = process.argv.indexOf('--rooms')
const ONLY_ROOMS = roomsArg >= 0 ? (process.argv[roomsArg + 1] || '').split(',').filter(Boolean) : []
if (!eventId) {
  console.error('Usage: pnpm av:assets <event> [--upload] [--rooms a,b]')
  process.exit(1)
}

const TIMEZONES: Record<string, string> = { devcon8: 'Asia/Kolkata', 'test-devcon-8': 'Asia/Kolkata', 'devcon-7': 'Asia/Bangkok' }
const TZ = TIMEZONES[eventId] ?? 'UTC'
// Folder name per room id; a room not listed uses its Pretalx name. Room ids
// are the slugified Pretalx names, so a rename in Pretalx changes the id: keep
// this map in step or cards move to a freshly created folder (2026-10-14: the
// stages were renamed and the old "Lotus 1", "Jasmine", "CLS"... folders
// emptied out; the crew keeps its own files in them, so they are left alone).
const ROOM_FOLDERS: Record<string, string> = {
  'main-stage-lotus': 'Main Stage (Lotus)',
  'lotus-stage-1': 'Lotus Stage 1',
  'lotus-stage-2': 'Lotus Stage 2',
  'lotus-stage-3': 'Lotus Stage 3',
  'jasmine-stage-4': 'Jasmine Stage 4',
  'community-led-stage': 'Community Led Stage',
  'cls-builders-room': 'CLS - Builders Room',
  'lightning-stage': 'Lightning Stage',
  'music-stage': 'Music',
  'workshop-1': 'Workshop 1',
  'workshop-2': 'Workshop 2',
}
const EVENT_FOLDER = '$$EVENT'
const CARDS_SUBFOLDER = 'Intro Cards' // inside each room/day folder, so the crew's own files stay apart
const PHOTOS_FOLDER = ['Speaker Assets', 'Photos']
// A Public-labelled image copied for every new file. It lives in the photos
// folder, which only this script touches, with a leading underscore so it sorts
// first; the rest of the AV tree is searched as a fallback if someone moves it.
const SEED_NAME = process.env.AV_DRIVE_SEED_NAME || "_public placeholder (DON'T DELETE).png"
const SITE = process.env.AV_CARDS_BASE_URL || 'https://devcon.org'
const CONCURRENCY = 4

const ROOT = path.join(__dirname, '../..')
const OUT = path.join(ROOT, '.av-assets', eventId)
const MANIFEST_PATH = path.join(ROOT, 'data/av-assets', `${eventId}.json`)
const config = getPretalxConfig(eventId)
const DRIVE_FOLDER_ID = process.env[`AV_DRIVE_FOLDER_ID_${eventId.toUpperCase().replace(/-/g, '_')}`]

// ---------------------------------------------------------------------------
// helpers

const safe = (s: string) =>
  s
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
const shortTitle = (t: string) => {
  const s = safe(t)
  if (s.length <= 70) return s
  const cut = s.slice(0, 70)
  return (cut.includes(' ') ? cut.slice(0, cut.lastIndexOf(' ')) : cut) + '…'
}
const sha256 = (b: Buffer) => crypto.createHash('sha256').update(b).digest('hex')
const readJsonDir = (dir: string): any[] =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) : []
const mimeOf = (name: string) => (name.endsWith('.jpg') ? 'image/jpeg' : name.endsWith('.png') ? 'image/png' : 'text/plain')

async function pool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    })
  )
  return out
}

async function fetchBuffer(url: string, tries = 3): Promise<{ buffer: Buffer; type: string }> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return { buffer: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') || '' }
    } catch (e) {
      lastErr = e
      await new Promise(r => setTimeout(r, 1500 * (i + 1)))
    }
  }
  throw lastErr
}

async function pretalxAll<T>(resource: string): Promise<T[]> {
  const headers = { Authorization: `Token ${config.PRETALX_API_KEY}` }
  let url: string | null = `${config.PRETALX_BASE_URI}/events/${config.PRETALX_EVENT_NAME}/${resource}`
  const out: T[] = []
  while (url) {
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Pretalx ${resource}: HTTP ${res.status}`)
    const data = (await res.json()) as { results: T[]; next: string | null }
    out.push(...data.results)
    url = data.next
  }
  return out
}

// ---------------------------------------------------------------------------
// data

/** One file to exist in Drive. `key` is stable across runs; the path may move. */
interface Target {
  key: string
  drivePath: string[] // folder names as they exist in Drive, then the file name
  buffer: Buffer
  /** A Google Doc (text uploaded as plain text, converted by Drive) instead of a binary file. */
  doc?: boolean
}

type ManifestEntry = { sha256: string; driveId?: string; path?: string; uploadedAt?: string }
type Manifest = { files: Record<string, ManifestEntry> }

async function main() {
  console.log(`AV assets · ${eventId} · ${UPLOAD ? 'build + sync Drive' : 'build only'}`)
  const sessions = readJsonDir(path.join(ROOT, 'data/sessions', eventId))
    .filter(s => s.slot_start && s.slot_roomId)
    .filter(s => ONLY_ROOMS.length === 0 || ONLY_ROOMS.includes(s.slot_roomId))
    .sort((a, b) => a.slot_start - b.slot_start)
  const rooms = Object.fromEntries(readJsonDir(path.join(ROOT, 'data/rooms', eventId)).map(r => [r.id, r]))
  const speakersById = Object.fromEntries(readJsonDir(path.join(ROOT, 'data/speakers')).map(s => [s.id, s]))
  const days = [...new Set(sessions.map(s => dayjs(s.slot_start).tz(TZ).format('YYYY-MM-DD')))].sort()
  const dayLabel = (startMs: number) => {
    const d = dayjs(startMs).tz(TZ)
    return `Day ${days.indexOf(d.format('YYYY-MM-DD')) + 1} - ${d.format('MMM D')}`
  }
  console.log(`${sessions.length} scheduled sessions · ${days.length} days · rooms: ${[...new Set(sessions.map(s => s.slot_roomId))].join(', ')}`)

  // Pretalx: original avatars
  const pretalxSpeakers = await pretalxAll<{ code: string; name: string; avatar_url?: string | null }>('speakers/?limit=100')
  const byCode = Object.fromEntries(pretalxSpeakers.map(s => [s.code, s]))
  console.log(`Pretalx: ${pretalxSpeakers.length} speakers`)

  const targets: Target[] = []
  const problems: string[] = []

  // Intro cards
  let cards = 0
  await pool(sessions, CONCURRENCY, async s => {
    try {
      const { buffer, type } = await fetchBuffer(`${SITE}/api/social/av/${s.id}/`)
      if (!type.startsWith('image/')) throw new Error(`not an image (${type})`)
      const name = `${dayjs(s.slot_start).tz(TZ).format('HH.mm')} ${shortTitle(s.title)} [${s.sourceId}].jpg`
      const room = ROOM_FOLDERS[s.slot_roomId] ?? rooms[s.slot_roomId]?.name ?? s.slot_roomId
      targets.push({ key: `card:${s.sourceId}`, drivePath: [EVENT_FOLDER, room, dayLabel(s.slot_start), CARDS_SUBFOLDER, name], buffer })
      cards++
    } catch (e: any) {
      problems.push(`card ${s.sourceId} (${s.title.slice(0, 40)}): ${e?.message ?? e}`)
    }
  })
  console.log(`cards: ${cards} rendered`)

  // Speaker photos (every speaker on a scheduled session)
  const speakerIds = [...new Set(sessions.flatMap(s => (s.speakers ?? []) as string[]))]
  let photos = 0
  const noPhoto: string[] = []
  const nameless: string[] = []
  await pool(speakerIds, CONCURRENCY, async id => {
    const sp = speakersById[id]
    if (!sp) return problems.push(`speaker file missing: ${id}`)
    // A Pretalx account that never set its name is reported as "Unnamed speaker":
    // nothing useful to put on a lower third, so no file, just a line for the
    // speaker team to chase.
    if (!sp.name || /^unnamed speaker$/i.test(sp.name)) return void nameless.push(`${sp.name || '?'} [${sp.sourceId}]`)
    const key = `photo:${sp.sourceId}`
    const src = byCode[sp.sourceId]?.avatar_url
    try {
      if (!src) {
        // No upload in Pretalx. Our data may still hold a real photo the speaker
        // removed since (the sync never replaces a photo with a blockie), mirrored
        // at 256 px: ship that, named so the crew knows it is small. Otherwise
        // ship the blockie the app shows (an SVG data URL), rasterised.
        const mirror = typeof sp.avatar === 'string' && /^https?:\/\//.test(sp.avatar) ? sp.avatar : null
        if (mirror) {
          const { buffer } = await fetchBuffer(mirror)
          const jpg = await sharp(buffer).jpeg({ quality: 90 }).toBuffer()
          noPhoto.push(`${sp.name} [${sp.sourceId}] (only a 256px copy)`)
          targets.push({ key, drivePath: [...PHOTOS_FOLDER, `${safe(sp.name)} [${sp.sourceId}] (256px only).jpg`], buffer: jpg })
          photos++
          return
        }
        noPhoto.push(`${sp.name} [${sp.sourceId}]`)
        const svg = typeof sp.avatar === 'string' && sp.avatar.startsWith('data:image/svg+xml,') ? decodeURIComponent(sp.avatar.slice('data:image/svg+xml,'.length)) : null
        if (!svg) return
        const png = await sharp(Buffer.from(svg)).resize(1024, 1024, { fit: 'contain' }).png().toBuffer()
        targets.push({ key, drivePath: [...PHOTOS_FOLDER, `${safe(sp.name)} [${sp.sourceId}] (blockie).png`], buffer: png })
        photos++
        return
      }
      const { buffer } = await fetchBuffer(src)
      const jpg = await sharp(buffer).rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer()
      targets.push({ key, drivePath: [...PHOTOS_FOLDER, `${safe(sp.name)} [${sp.sourceId}].jpg`], buffer: jpg })
      photos++
    } catch (e: any) {
      problems.push(`photo ${sp.name} [${sp.sourceId}]: ${e?.message ?? e}`)
    }
  })
  noPhoto.sort()
  // The list covers the whole event; a partial run (--rooms) must not overwrite it.
  // A Google Doc rather than a .txt: opening a .txt in Drive offers "open with Docs", which saves a stray copy each time.
  if (!ONLY_ROOMS.length) targets.push({ key: 'list:no-photo', drivePath: [...PHOTOS_FOLDER, '_speakers without photo'], buffer: Buffer.from(noPhoto.join('\n') + '\n'), doc: true })
  if (nameless.length) problems.push(`${nameless.length} speaker account(s) without a name in Pretalx, skipped: ${nameless.join(', ')}`)
  console.log(`photos: ${photos} saved, of which ${noPhoto.length} without a photo in Pretalx (256px mirror or blockie)`)

  // Local tree + manifest diff
  fs.mkdirSync(OUT, { recursive: true })
  const manifest: Manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : { files: {} }
  const produced = new Map<string, Target & { hash: string; pathStr: string }>()
  for (const t of targets) {
    const local = path.join(OUT, ...t.drivePath.map(safe))
    fs.mkdirSync(path.dirname(local), { recursive: true })
    fs.writeFileSync(local, t.buffer)
    produced.set(t.key, { ...t, hash: sha256(t.buffer), pathStr: t.drivePath.join('/') })
  }
  const entry = (k: string) => manifest.files[k]
  const isNew = (k: string) => !entry(k)?.driveId
  const isChanged = (k: string) => !isNew(k) && entry(k).sha256 !== produced.get(k)!.hash
  const isMoved = (k: string) => !isNew(k) && entry(k).path !== produced.get(k)!.pathStr
  // A partial run (--rooms) produces a subset, so nothing outside it counts as stale.
  const stale = ONLY_ROOMS.length ? [] : Object.keys(manifest.files).filter(k => manifest.files[k].driveId && !produced.has(k))
  const keys = [...produced.keys()]
  const todo = keys.filter(k => isNew(k) || isChanged(k) || isMoved(k))
  console.log(`\nlocal tree: ${OUT}`)
  console.log(
    `files: ${produced.size} · new ${keys.filter(isNew).length} · changed ${keys.filter(isChanged).length} · moved ${keys.filter(k => isMoved(k) && !isChanged(k)).length} · unchanged ${produced.size - todo.length} · stale ${stale.length}`
  )
  for (const k of keys.filter(isMoved)) console.log(`  moves: ${entry(k).path}  ->  ${produced.get(k)!.pathStr}`)
  for (const k of stale) console.log(`  stale, will be trashed: ${entry(k).path ?? k}`)

  if (!UPLOAD) {
    report(problems)
    return
  }

  // Sync Drive (see the header for why every file starts as a copy of the seed)
  if (!DRIVE_FOLDER_ID) throw new Error(`AV_DRIVE_FOLDER_ID_${eventId.toUpperCase().replace(/-/g, '_')} is not set`)
  const auth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  // googleapis bundles its own google-auth-library types; same cast as the other scripts.
  const drive = google.drive({ version: 'v3', auth: auth as any })
  const listChildren = async (parentId: string) =>
    (
      await drive.files.list({
        q: `'${parentId}' in parents and trashed = false`,
        fields: 'files(id,name,mimeType)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 200,
      })
    ).data.files ?? []
  const findSeed = async (folderId: string, depth = 0): Promise<string | null> => {
    const children = await listChildren(folderId)
    const hit = children.find(f => f.name === SEED_NAME && !f.mimeType?.includes('google-apps'))
    if (hit) return hit.id!
    if (depth >= 2) return null
    for (const f of children.filter(f => f.mimeType === 'application/vnd.google-apps.folder')) {
      const id = await findSeed(f.id!, depth + 1)
      if (id) return id
    }
    return null
  }
  // Cache the lookup promise, not the result: concurrent uploads into the same
  // new folder must share one creation or Drive ends up with duplicates.
  const folderCache = new Map<string, Promise<string>>()
  const childFolder = (parentId: string, name: string): Promise<string> => {
    const key = `${parentId}/${name}`
    if (!folderCache.has(key)) {
      folderCache.set(
        key,
        (async () => {
          const found = (await listChildren(parentId)).find(f => f.name === name && f.mimeType === 'application/vnd.google-apps.folder')?.id
          if (found) return found
          createdFolders.push(name)
          return (await drive.files.create({ requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }, fields: 'id', supportsAllDrives: true })).data.id!
        })()
      )
    }
    return folderCache.get(key)!
  }
  const createdFolders: string[] = []
  const resolveFolder = async (segments: string[]): Promise<string> => {
    let id = DRIVE_FOLDER_ID
    for (const seg of segments) id = await childFolder(id, seg)
    return id
  }
  const seedId = (await findSeed(await resolveFolder(PHOTOS_FOLDER))) ?? (await findSeed(DRIVE_FOLDER_ID))
  if (!seedId) throw new Error(`seed image "${SEED_NAME}" not found in ${PHOTOS_FOLDER.join('/')} or elsewhere under the AV folder: upload one there and set its label to Public`)
  const writeContent = (fileId: string, name: string, buffer: Buffer, doc = false) =>
    drive.files.update({
      fileId,
      // a Google Doc keeps its own type; plain text uploaded into it is converted by Drive
      requestBody: doc ? { name } : { name, mimeType: mimeOf(name) },
      media: { mimeType: doc ? 'text/plain' : mimeOf(name), body: Readable.from([buffer]) },
      supportsAllDrives: true,
    })
  let created = 0
  let updated = 0
  let moved = 0
  let trashed = 0
  await pool(todo, CONCURRENCY, async key => {
    const t = produced.get(key)!
    const name = t.drivePath[t.drivePath.length - 1]
    const prev = entry(key)
    try {
      const folderId = await resolveFolder(t.drivePath.slice(0, -1))
      if (prev?.driveId) {
        try {
          if (isMoved(key)) {
            const current = (await drive.files.get({ fileId: prev.driveId, fields: 'parents', supportsAllDrives: true })).data.parents?.[0]
            await drive.files.update({
              fileId: prev.driveId,
              requestBody: { name },
              addParents: current === folderId ? undefined : folderId,
              removeParents: current && current !== folderId ? current : undefined,
              supportsAllDrives: true,
            })
            moved++
          }
          if (isChanged(key)) {
            await writeContent(prev.driveId, name, t.buffer, t.doc)
            updated++
          }
          manifest.files[key] = { sha256: t.hash, driveId: prev.driveId, path: t.pathStr, uploadedAt: new Date().toISOString() }
          return
        } catch {
          // gone (deleted by hand, or an upload from before the seed method): create afresh
        }
      }
      let id: string
      if (t.doc) {
        // Google-native files are not labelled, so a Doc can be created directly (text converted by Drive).
        id = (
          await drive.files.create({
            requestBody: { name, mimeType: 'application/vnd.google-apps.document', parents: [folderId] },
            media: { mimeType: 'text/plain', body: Readable.from([t.buffer]) },
            fields: 'id',
            supportsAllDrives: true,
          })
        ).data.id!
      } else {
        id = (await drive.files.copy({ fileId: seedId, requestBody: { name, parents: [folderId] }, fields: 'id', supportsAllDrives: true })).data.id!
        await writeContent(id, name, t.buffer)
      }
      manifest.files[key] = { sha256: t.hash, driveId: id, path: t.pathStr, uploadedAt: new Date().toISOString() }
      created++
    } catch (e: any) {
      problems.push(`drive ${t.pathStr}: ${e?.message ?? e}`)
    }
  })
  await pool(stale, CONCURRENCY, async key => {
    const id = entry(key).driveId!
    try {
      await drive.files.update({ fileId: id, requestBody: { trashed: true }, supportsAllDrives: true })
      delete manifest.files[key]
      trashed++
    } catch (e: any) {
      problems.push(`trash ${entry(key).path ?? key}: ${e?.message ?? e} (delete by hand)`)
    }
  })
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\nDrive: created ${created} · rewritten in place ${updated} · moved or renamed ${moved} · trashed ${trashed}`)
  if (createdFolders.length) console.log(`  folders created: ${createdFolders.length} (${[...new Set(createdFolders)].join(', ')})`)
  report(problems)
}

function report(problems: string[]) {
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`)
    for (const p of problems) console.log('  ' + p)
  }
  console.log('\nDone')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
