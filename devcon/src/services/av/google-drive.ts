/**
 * The AV team's Google Drive, for the stream intros operators render on the
 * AV page: the same service account, folder tree and naming as devcon-api's
 * AV asset pack (devcon-api/src/utils/av-drive.ts, av-assets.ts) and the
 * intro renderer (github.com/streamethorg/devcon-animation), so a video made
 * here lands next to the automatic ones:
 *
 *   <AV folder>/$$EVENT/<Room>/<Day N - Mon D>/Intro Animation/      1920x1080
 *   <AV folder>/$$EVENT/<Room>/<Day N - Mon D>/IRL Intro Animation/  stage screen sizes
 *
 * Drive's REST API over fetch, with a service-account token signed by jose:
 * no googleapis bundle in the Netlify function. Server-only.
 *
 * Two Drive facts shape this module. EF's Drive labels every file a service
 * account creates "EF Internal" and hides it from that account, but an
 * in-drive copy of a file labelled Public keeps Public: so every new file is a
 * copy of a human-placed seed (the Public video placeholder in Speaker
 * Assets/Photos, as av-assets.ts does for images) that then gets its bytes
 * replaced. And a function cannot carry a 50 MB upload (6 MB body cap), so the
 * bytes go from the browser into the copy through a resumable upload session
 * opened here with the page's origin, which Google then accepts cross-origin.
 *
 * Env: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY (the service account),
 * AV_DRIVE_FOLDER_ID_DEVCON8 (the AV top folder), optional AV_DRIVE_VIDEO_SEED_NAME.
 */
import { importPKCS8, SignJWT } from 'jose'
import { AV_TIMEZONE, avRoomId } from './av-assets'
export { cardRenderKey } from './av-assets'

const DRIVE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

export const AV_EVENT_FOLDER = '$$EVENT'
export const INTRO_FOLDER = 'Intro Animation'
export const IRL_INTRO_FOLDER = 'IRL Intro Animation'
/** Speaker Assets/Photos holds the seeds a human labelled Public. */
const SEED_FOLDER = ['Speaker Assets', 'Photos']
const VIDEO_SEED_NAME = process.env.AV_DRIVE_VIDEO_SEED_NAME || "_public video placeholder (DON'T DELETE).mp4"

/** Devcon 8 days in event time, for the "Day N" folder numbers (devcon-api counts them from the event's dates). */
const AV_EVENT_FIRST_DAY = '2026-11-03'

/**
 * Folder name per room id, a copy of AV_ROOM_FOLDERS in devcon-api/src/utils/av-drive.ts: keep the two in step.
 * A room not listed uses its Pretalx name.
 */
export const AV_ROOM_FOLDERS: Record<string, string> = {
  'main-stage-lotus': 'Main Stage (Lotus)',
  'lotus-stage-1': 'Lotus Stage 1',
  'lotus-stage-2': 'Lotus Stage 2',
  'lotus-stage-3': 'Lotus Stage 3',
  'jasmine-stage-4': 'Jasmine Stage 4',
  'community-led-stage': 'Community Led Stage',
  'cls-builders-room': 'CLS - Builders Room',
  'lightning-stage': 'Lightning Stage',
  'music-stage': 'Music Stage',
  'workshop-1': 'Workshop 1',
  'workshop-2': 'Workshop 2',
}

export function avRoomFolder(roomName: string): string {
  return AV_ROOM_FOLDERS[avRoomId(roomName)] ?? roomName
}

/** "Day 1 - Nov 3" for a slot start, the day counted in event time from the first event day. */
export function avDayFolder(slotStart: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: AV_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(slotStart))
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {})
  const day = `${parts.year}-${parts.month}-${parts.day}`
  const n = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${AV_EVENT_FIRST_DAY}T00:00:00Z`)) / 86_400_000) + 1
  const label = new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `Day ${n} - ${label}`
}

/** The intro renderer's file name for a talk's video, plus the render's version: `HH.mm <Title> [CODE] (WxH) v2.mp4`. */
export function introVideoName(cardFileName: string, width: number, height: number, version: number): string {
  // The card's Drive-style name minus the page's " - <Kind> WxH.jpg" suffix.
  const base = cardFileName.replace(/ - (YouTube|Screen|Social|Social Time|Story) \d+x\d+\.(jpg|png)$/i, '')
  return `${base} (${width}x${height}) v${version}.mp4`
}

// ---- auth ----

let token: { value: string; expiresAt: number } | null = null

async function accessToken(): Promise<string> {
  if (token && Date.now() < token.expiresAt - 60_000) return token.value
  const email = process.env.GOOGLE_CLIENT_EMAIL
  const pem = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (!email || !pem) throw new Error('GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY are not set')
  const key = await importPKCS8(pem, 'RS256')
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/drive' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key)
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!r.ok) throw new Error(`Google token: ${r.status} ${await r.text().catch(() => '')}`)
  const data = (await r.json()) as { access_token: string; expires_in: number }
  token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return token.value
}

async function api<T>(path: string, init: RequestInit = {}, base = DRIVE): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(init.headers as Record<string, string>) },
    signal: AbortSignal.timeout(20_000),
  })
  if (!r.ok) throw new Error(`Drive ${init.method ?? 'GET'} ${path.split('?')[0]}: ${r.status} ${await r.text().catch(() => '')}`)
  return (await r.json()) as T
}

export interface DriveFile {
  id: string
  name: string
  mimeType?: string
  size?: string
  modifiedTime?: string
  appProperties?: Record<string, string>
}

const ALL_DRIVES = 'supportsAllDrives=true&includeItemsFromAllDrives=true'

/** Every file matching `q` (all pages). */
export async function driveList(q: string, fields = 'id,name,mimeType,size,modifiedTime,appProperties'): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken = ''
  do {
    const page = await api<{ files: DriveFile[]; nextPageToken?: string }>(
      `/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(`nextPageToken,files(${fields})`)}&pageSize=1000&${ALL_DRIVES}${
        pageToken ? `&pageToken=${pageToken}` : ''
      }`
    )
    files.push(...(page.files ?? []))
    pageToken = page.nextPageToken ?? ''
  } while (pageToken)
  return files
}

const escapeQ = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

async function childByName(parentId: string, name: string, folder: boolean): Promise<DriveFile | null> {
  const files = await driveList(
    `'${parentId}' in parents and name = '${escapeQ(name)}' and trashed = false and mimeType ${folder ? '=' : '!='} '${FOLDER_MIME}'`
  )
  return files[0] ?? null
}

/** The folder at `path` under `parentId`, each level created when missing (folders carry no label, so a plain create is fine). */
export async function ensureFolderPath(parentId: string, path: string[]): Promise<string> {
  let id = parentId
  for (const name of path) {
    const found = await childByName(id, name, true)
    if (found) {
      id = found.id
      continue
    }
    const created = await api<DriveFile>(`/files?${ALL_DRIVES}&fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [id] }),
    })
    id = created.id
  }
  return id
}

export function avRootFolderId(): string {
  const id = process.env.AV_DRIVE_FOLDER_ID_DEVCON8
  if (!id) throw new Error('AV_DRIVE_FOLDER_ID_DEVCON8 is not set')
  return id
}

/** The Public video seed (Speaker Assets/Photos), by name. */
export async function videoSeedId(): Promise<string> {
  const photos = await ensureFolderPath(avRootFolderId(), SEED_FOLDER)
  const seed = await childByName(photos, VIDEO_SEED_NAME, false)
  if (!seed) throw new Error(`video seed "${VIDEO_SEED_NAME}" not found in ${SEED_FOLDER.join('/')}: upload one there and set its label to Public`)
  return seed.id
}

/** Copy `seedId` into `folderId` as `name`, carrying the seed's Public label; returns the new file. */
export async function copySeed(
  seedId: string,
  folderId: string,
  name: string,
  appProperties: Record<string, string>,
  description: string
): Promise<DriveFile> {
  return api<DriveFile>(`/files/${seedId}/copy?${ALL_DRIVES}&fields=id,name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parents: [folderId], appProperties, description }),
  })
}

/**
 * A resumable upload session that replaces `fileId`'s bytes. Opened with the
 * page's origin, so the browser's PUT to the session URL passes CORS; the
 * URL carries its own authorisation and is good for one upload.
 */
export async function openResumableUpload(fileId: string, mimeType: string, size: number, origin: string): Promise<string> {
  const r = await fetch(`${UPLOAD}/files/${fileId}?uploadType=resumable&${ALL_DRIVES}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(size),
      Origin: origin,
    },
    body: '{}',
    signal: AbortSignal.timeout(20_000),
  })
  if (!r.ok) throw new Error(`Drive upload session: ${r.status} ${await r.text().catch(() => '')}`)
  const location = r.headers.get('location')
  if (!location) throw new Error('Drive upload session: no session URL returned')
  return location
}

/** Move a file this account owns to the trash (a test copy, a copy whose upload never came). */
export async function trashFile(id: string): Promise<void> {
  await api(`/files/${id}?${ALL_DRIVES}&fields=id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  })
}

export const driveViewLink = (id: string) => `https://drive.google.com/file/d/${id}/view`
export const drivePreviewLink = (id: string) => `https://drive.google.com/file/d/${id}/preview`
export const driveDownloadLink = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`
