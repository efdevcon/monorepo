/**
 * AV asset pack for an event: a 1920x1080 intro card per session (the AV card
 * devcon.org renders for YouTube) and each speaker's photo in the best quality
 * Pretalx holds, in two flat folders of the AV team's Drive. Names carry the
 * title and the Pretalx code, like the decks, and nothing that moves (no room,
 * day or start time): a rescheduled session keeps its file. Which file belongs
 * to which slot is for the run of show to say.
 *
 *   pnpm av:assets devcon8                         # build the local tree, report what would change
 *   pnpm av:assets devcon8 --upload                # also upload new/changed files to the AV Drive folder
 *   pnpm av:assets devcon8 --rooms lotus-1,cls-stage   # limit to some rooms
 *
 * Local output: devcon-api/.av-assets/<event>/ (gitignored), mirroring Drive:
 *   Speaker Assets/Intro Cards/<Title> [CODE].jpg                  intro card
 *   Speaker Assets/Photos - Thumbnails/<Speaker Name> [CODE].jpg  up to 1024 px
 *   Speaker Assets/Photos - Thumbnails/<Speaker Name> [CODE] (256px only).jpg  photo gone from Pretalx, our small mirror
 *   Speaker Assets/Photos - Thumbnails/<Speaker Name> [CODE] (blockie).png  no photo at all
 *   Speaker Assets/Photos - Thumbnails/_speakers without photo.txt
 *
 * Drive: the service account can create files in the AV folder but loses sight
 * of its own uploads about 45 s later (Drive labels them), so it can neither
 * list nor update nor delete them. The manifest data/av-assets/<event>.json
 * (committed, so the CI run after each schedule release sees it) records what
 * was uploaded (path, hash, file id): re-runs upload only new or changed files
 * and print the stale ones for a human to remove. Folders are never created,
 * for the same reason: a missing folder is reported instead.
 *
 * Env: AV_DRIVE_FOLDER_ID_<EVENT> (the AV top folder), GOOGLE_CLIENT_EMAIL and
 * GOOGLE_PRIVATE_KEY (the service account, granted access to that folder).
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { Readable } from 'stream'
import sharp from 'sharp'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import { getPretalxConfig } from '@/utils/config'

const eventId = process.argv[2]
const UPLOAD = process.argv.includes('--upload')
const roomsArg = process.argv.indexOf('--rooms')
const ONLY_ROOMS = roomsArg >= 0 ? (process.argv[roomsArg + 1] || '').split(',').filter(Boolean) : []
if (!eventId) {
  console.error('Usage: pnpm av:assets <event> [--upload] [--rooms a,b]')
  process.exit(1)
}

const CARDS_FOLDER = ['Speaker Assets', 'Intro Cards']
const PHOTOS_FOLDER = ['Speaker Assets', 'Photos / Thumbnails']
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

interface Target {
  drivePath: string[] // folder names as they exist in Drive, then the file name
  buffer: Buffer
}

type Manifest = { files: Record<string, { sha256: string; driveId?: string; uploadedAt?: string }> }

async function main() {
  console.log(`AV assets · ${eventId} · ${UPLOAD ? 'build + upload' : 'build only'}`)
  const sessions = readJsonDir(path.join(ROOT, 'data/sessions', eventId))
    .filter(s => s.slot_start && s.slot_roomId)
    .filter(s => ONLY_ROOMS.length === 0 || ONLY_ROOMS.includes(s.slot_roomId))
    .sort((a, b) => a.slot_start - b.slot_start)
  const speakersById = Object.fromEntries(readJsonDir(path.join(ROOT, 'data/speakers')).map(s => [s.id, s]))
  console.log(`${sessions.length} scheduled sessions · rooms: ${[...new Set(sessions.map(s => s.slot_roomId))].join(', ')}`)

  // Pretalx: original avatars
  const pretalxSpeakers = await pretalxAll<{ code: string; name: string; avatar_url?: string | null }>('speakers/?limit=100')
  const byCode = Object.fromEntries(pretalxSpeakers.map(s => [s.code, s]))
  console.log(`Pretalx: ${pretalxSpeakers.length} speakers`)

  const targets: Target[] = []
  const problems: string[] = []

  // Intro cards
  const cardName = new Map<string, string>()
  await pool(sessions, CONCURRENCY, async s => {
    try {
      const { buffer, type } = await fetchBuffer(`${SITE}/api/social/av/${s.id}/`)
      if (!type.startsWith('image/')) throw new Error(`not an image (${type})`)
      const name = `${shortTitle(s.title)} [${s.sourceId}].jpg`
      cardName.set(s.id, name)
      targets.push({ drivePath: [...CARDS_FOLDER, name], buffer })
    } catch (e: any) {
      problems.push(`card ${s.sourceId} (${s.title.slice(0, 40)}): ${e?.message ?? e}`)
    }
  })
  console.log(`cards: ${cardName.size} rendered`)

  // Speaker photos (every speaker on a scheduled session)
  const speakerIds = [...new Set(sessions.flatMap(s => (s.speakers ?? []) as string[]))]
  const photoName = new Map<string, string>()
  const noPhoto: string[] = []
  const nameless: string[] = []
  await pool(speakerIds, CONCURRENCY, async id => {
    const sp = speakersById[id]
    if (!sp) return problems.push(`speaker file missing: ${id}`)
    // A Pretalx account that never set its name is reported as "Unnamed speaker":
    // nothing useful to put on a lower third, so no file, just a line for the
    // speaker team to chase.
    if (!sp.name || /^unnamed speaker$/i.test(sp.name)) return void nameless.push(`${sp.name || '?'} [${sp.sourceId}]`)
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
          const name = `${safe(sp.name)} [${sp.sourceId}] (256px only).jpg`
          photoName.set(id, name)
          noPhoto.push(`${sp.name} [${sp.sourceId}] (only a 256px copy)`)
          targets.push({ drivePath: [...PHOTOS_FOLDER, name], buffer: jpg })
          return
        }
        noPhoto.push(`${sp.name} [${sp.sourceId}]`)
        const svg = typeof sp.avatar === 'string' && sp.avatar.startsWith('data:image/svg+xml,') ? decodeURIComponent(sp.avatar.slice('data:image/svg+xml,'.length)) : null
        if (!svg) return
        const png = await sharp(Buffer.from(svg)).resize(1024, 1024, { fit: 'contain' }).png().toBuffer()
        const name = `${safe(sp.name)} [${sp.sourceId}] (blockie).png`
        photoName.set(id, name)
        targets.push({ drivePath: [...PHOTOS_FOLDER, name], buffer: png })
        return
      }
      const { buffer } = await fetchBuffer(src)
      const jpg = await sharp(buffer).rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer()
      const name = `${safe(sp.name)} [${sp.sourceId}].jpg`
      photoName.set(id, name)
      targets.push({ drivePath: [...PHOTOS_FOLDER, name], buffer: jpg })
    } catch (e: any) {
      problems.push(`photo ${sp.name} [${sp.sourceId}]: ${e?.message ?? e}`)
    }
  })
  noPhoto.sort()
  targets.push({ drivePath: [...PHOTOS_FOLDER, '_speakers without photo.txt'], buffer: Buffer.from(noPhoto.join('\n') + '\n') })
  if (nameless.length) problems.push(`${nameless.length} speaker account(s) without a name in Pretalx, skipped: ${nameless.join(', ')}`)
  console.log(`photos: ${photoName.size} saved, of which ${noPhoto.length} without a photo in Pretalx (256px mirror or blockie)`)

  // Local tree + manifest diff
  fs.mkdirSync(OUT, { recursive: true })
  const manifest: Manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : { files: {} }
  const produced = new Map<string, Target & { hash: string }>()
  for (const t of targets) {
    const key = t.drivePath.join('/')
    const local = path.join(OUT, ...t.drivePath.map(safe))
    fs.mkdirSync(path.dirname(local), { recursive: true })
    fs.writeFileSync(local, t.buffer)
    produced.set(key, { ...t, hash: sha256(t.buffer) })
  }
  const isNew = (k: string) => !manifest.files[k]?.driveId
  const isChanged = (k: string) => !!manifest.files[k]?.driveId && manifest.files[k].sha256 !== produced.get(k)!.hash
  const stale = Object.keys(manifest.files).filter(k => manifest.files[k].driveId && !produced.has(k))
  const toUpload = [...produced.keys()].filter(k => isNew(k) || isChanged(k))
  console.log(`\nlocal tree: ${OUT}`)
  console.log(`files: ${produced.size} · new ${[...produced.keys()].filter(isNew).length} · changed ${[...produced.keys()].filter(isChanged).length} · unchanged ${produced.size - toUpload.length} · stale in Drive ${stale.length}`)
  for (const k of stale) console.log(`  stale, delete by hand in Drive: ${k}`)
  for (const k of [...produced.keys()].filter(isChanged)) console.log(`  changed, the old copy stays in Drive, delete by hand: ${k}`)

  if (!UPLOAD) {
    report(problems)
    return
  }

  // Upload
  if (!DRIVE_FOLDER_ID) throw new Error(`AV_DRIVE_FOLDER_ID_${eventId.toUpperCase().replace(/-/g, '_')} is not set`)
  const auth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  // googleapis bundles its own google-auth-library types; same cast as the other scripts.
  const drive = google.drive({ version: 'v3', auth: auth as any })
  const folderCache = new Map<string, string | null>()
  const childFolder = async (parentId: string, name: string): Promise<string | null> => {
    const key = `${parentId}/${name}`
    if (folderCache.has(key)) return folderCache.get(key)!
    const res = await drive.files.list({
      q: `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })
    const id = res.data.files?.[0]?.id ?? null
    folderCache.set(key, id)
    return id
  }
  const resolveFolder = async (segments: string[]): Promise<string | null> => {
    let id: string | null = DRIVE_FOLDER_ID
    for (const seg of segments) {
      id = await childFolder(id!, seg)
      if (!id) return null
    }
    return id
  }
  const missingFolders = new Set<string>()
  let uploaded = 0
  await pool(toUpload, CONCURRENCY, async key => {
    const t = produced.get(key)!
    const folderSegments = t.drivePath.slice(0, -1)
    const folderId = await resolveFolder(folderSegments)
    if (!folderId) return void missingFolders.add(folderSegments.join('/'))
    const name = t.drivePath[t.drivePath.length - 1]
    const mimeType = name.endsWith('.jpg') ? 'image/jpeg' : name.endsWith('.png') ? 'image/png' : name.endsWith('.csv') ? 'text/csv' : 'text/plain'
    try {
      const res = await drive.files.create({
        requestBody: { name, parents: [folderId] },
        media: { mimeType, body: Readable.from([t.buffer]) },
        fields: 'id',
        supportsAllDrives: true,
      })
      manifest.files[key] = { sha256: t.hash, driveId: res.data.id!, uploadedAt: new Date().toISOString() }
      uploaded++
    } catch (e: any) {
      problems.push(`upload ${key}: ${e?.message ?? e}`)
    }
  })
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\nuploaded ${uploaded} of ${toUpload.length}`)
  for (const f of [...missingFolders].sort()) console.log(`  folder missing in Drive, create it by hand and re-run: ${f}`)
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
