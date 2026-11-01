/**
 * Fresh AV renders for the AV page: the same Devcon 8 card the nightly job
 * fetches from /api/social/av/ and /api/social/av-screen/, but read straight
 * from Pretalx and never served from the card cache, so a last-minute edit
 * in Pretalx is on the next render.
 *
 * Two modes. The stored mode (`?inputs=<hash>`) is what the page uses: the
 * session was read from Pretalx once when the operator opened it
 * (prepareCardInputs, with every speaker photo already fetched), so a render
 * only reads that small JSON from storage, draws, and keeps the PNG and the
 * JPEG in the av-assets bucket under a name derived from everything that went
 * in. The same inputs and edits give the same name, so a second request (the
 * intro video needs the PNG the operator already saw as JPEG) costs nothing,
 * and the page shows and copies CDN links. Each render stays well inside the
 * function's time limit because no Pretalx round trip rides on it.
 *
 * The byte mode (no `?inputs=`) is the original behaviour, kept for anything
 * that fetches a card directly: Pretalx and photos on every request, the
 * image in the response.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'node:crypto'
import { checkAvAuth } from 'utils/adminAuth'
import { poppinsFonts } from 'services/social-cards/assets'
import { renderDc8SocialCard, renderDc8StoryCard } from 'services/social-cards/dc8-social-card'
import { avatarDataUrl, getSessionFromPretalx, speakerImageDataUrls } from 'services/social-cards/data'
import { getOfficialSpeakers, hardcodedSlot } from './pretalx'
import { pngToJpeg } from 'services/og-cache'
import { AV_EVENT_ID, cardFileName, contentDisposition, isSessionCode } from './av-assets'
import { avGetJson, avObjectExists, avObjectUrl, avPutObject, CACHE_IMMUTABLE_S } from './storage'

/**
 * Story is the portrait Instagram layout; the others are the one landscape card at their size,
 * Social Time with the session's day, time and room above the title.
 */
export type CardKind = 'YouTube' | 'Screen' | 'Social' | 'Social Time' | 'Story'

/**
 * JPEG for the downloads (the nightly job's format); lossless PNG as the
 * source of an intro video, so the card is encoded once, by the video encoder.
 */
export type CardFormat = 'jpeg' | 'png'

export const parseCardFormat = (query: Record<string, string | string[] | undefined>): CardFormat =>
  query.format === 'png' ? 'png' : 'jpeg'

/** Hand edits from the AV page: a corrected title, and/or speakers picked from the official list. */
export interface CardEdits {
  title?: string
  speakerCodes?: string[]
}

const MAX_TITLE = 200
const MAX_SPEAKERS = 12

/** `?title=` and `?speakers=CODE,CODE` from a card route's query, checked; an error string when invalid. */
export function parseCardEdits(query: Record<string, string | string[] | undefined>): CardEdits | string {
  const edits: CardEdits = {}
  if (typeof query.title === 'string') {
    // eslint-disable-next-line no-control-regex
    const title = query.title
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (title.length > MAX_TITLE) return `title longer than ${MAX_TITLE} characters`
    if (title) edits.title = title
  }
  if (typeof query.speakers === 'string') {
    const codes = [
      ...new Set(
        query.speakers
          .split(',')
          .map(c => c.trim().toUpperCase())
          .filter(Boolean)
      ),
    ]
    if (codes.length > MAX_SPEAKERS) return `more than ${MAX_SPEAKERS} speakers`
    if (!codes.every(isSessionCode)) return 'invalid speaker code'
    edits.speakerCodes = codes
  }
  return edits
}

// ---- render inputs: Pretalx read once per session open ----

/**
 * Bump when the card template changes: the render name includes it, so
 * every card is drawn again instead of coming back from storage.
 */
export const CARD_VERSION = 1

/** What a render needs from the network, read once and stored: the session in the card's shape and its speaker photos as data URLs, by speaker code. */
export interface CardInputs {
  session: any
  avatars: Record<string, string>
}

const INPUTS_HASH = /^[a-f0-9]{16}$/
export const parseInputsHash = (query: Record<string, string | string[] | undefined>): string | null =>
  typeof query.inputs === 'string' && INPUTS_HASH.test(query.inputs) ? query.inputs : null

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex')
const inputsKey = (code: string, hash: string) => `inputs/${code}/${hash}.json`

/** The session as the card routes see it: Pretalx's submission, with the hardcoded slot when Pretalx has none. */
async function readSession(code: string): Promise<any | null> {
  const session = await getSessionFromPretalx(code)
  if (!session || session.eventId !== AV_EVENT_ID) return null
  // A session with no Pretalx slot but a hardcoded one: its time goes in the file name (and the Story).
  if (!session.slot_start) {
    const slot = hardcodedSlot(code)
    session.slot_start = slot?.start ?? null
    if (slot && !session.slot_room) session.slot_room = { name: slot.room }
  }
  return session
}

/**
 * Read the session from Pretalx and store it with its speaker photos as the
 * render inputs; returns their hash. Null when the session is not a public
 * Devcon 8 session. Throws on a Pretalx or storage failure: the caller
 * decides what the page gets.
 *
 * The hash names what the inputs are made of (the session as Pretalx has it
 * and the photo URLs; Pretalx gives a re-uploaded photo a new URL), not the
 * photo bytes: a slow download falls back to Pretalx's own thumbnail, and
 * hashing bytes made the same session come out different twice in a row,
 * drawing every card again. A stored file with that name was made from the
 * same things, so it is reused as is and the photos are not fetched again.
 * A photo that did not arrive at all must not fix the inputs for good: such
 * a file gets a name of its own, and the next open tries the photos again.
 */
export async function prepareCardInputs(code: string): Promise<string | null> {
  const session = await readSession(code)
  if (!session) return null
  const speakers: any[] = session.speakers ?? []
  const sources = speakers.map(s => [s.id, s.avatar ?? ''])
  const canonical = sha1(JSON.stringify({ session, sources, v: 1 })).slice(0, 16)
  if (await avObjectExists(inputsKey(code, canonical))) return canonical
  const images = await speakerImageDataUrls(session)
  const missing = speakers
    .filter(s => s.avatar && !String(s.avatar).startsWith('data:') && !images.has(s.id))
    .map(s => s.id)
  const hash = missing.length ? sha1(JSON.stringify({ canonical, missing })).slice(0, 16) : canonical
  const inputs: CardInputs = { session, avatars: Object.fromEntries(images) }
  await avPutObject(inputsKey(code, hash), Buffer.from(JSON.stringify(inputs)), 'application/json', CACHE_IMMUTABLE_S)
  return hash
}

// ---- drawing ----

/**
 * Apply the page's edits to the session: the title, and the speakers in the
 * operator's order. Speakers already on the session keep their photo; a
 * speaker added from the official list is checked against it (the card never
 * names someone Pretalx does not have) and their photo fetched. Returns an
 * error string when a code is not official.
 */
async function applyEdits(session: any, images: Map<string, string>, edits: CardEdits): Promise<string | null> {
  if (edits.title) session.title = edits.title
  if (!edits.speakerCodes) return null
  const own = new Map<string, any>((session.speakers ?? []).map((s: any) => [s.id, s]))
  const added = edits.speakerCodes.filter(c => !own.has(c))
  let official: Map<string, { code: string; name: string; avatar: string }> | null = null
  if (added.length) {
    official = await getOfficialSpeakers()
    const unknown = added.filter(c => !official!.has(c))
    if (unknown.length) return `not on the official speaker list: ${unknown.join(', ')}`
    await Promise.all(
      added.map(async c => {
        const url = await avatarDataUrl(official!.get(c)!.avatar, 384)
        if (url) images.set(c, url)
      })
    )
  }
  session.speakers = edits.speakerCodes.map(c => {
    if (own.has(c)) return own.get(c)
    const sp = official!.get(c)!
    return { id: sp.code, name: sp.name, avatar: sp.avatar }
  })
  return null
}

async function drawCard(
  session: any,
  images: Map<string, string>,
  kind: CardKind,
  width: number,
  height: number
): Promise<{ png: Buffer; fileName: string }> {
  const card =
    kind === 'Story'
      ? renderDc8StoryCard(session, images, poppinsFonts(), { width, height })
      : renderDc8SocialCard(session, images, poppinsFonts(), { width, height }, { showSlot: kind === 'Social Time' })
  const png = Buffer.from(await card.arrayBuffer())
  const fileName = cardFileName(
    { code: session.sourceId ?? session.id, title: session.title, start: session.slot_start },
    kind,
    width,
    height
  )
  return { png, fileName }
}

// ---- stored mode ----

export interface StoredCard {
  png: string
  jpeg: string
  fileName: string
  /** JPEG size, for the tile. */
  bytes: number
  /** True when nothing was drawn: the same inputs and edits were rendered before. */
  cached: boolean
}

/**
 * Render from stored inputs into storage and answer the two CDN URLs. An
 * expired or unknown inputs hash is a 410: the page opens the session again.
 */
export async function sendStoredCard(
  res: NextApiResponse,
  code: string,
  kind: CardKind,
  width: number,
  height: number,
  edits: CardEdits,
  inputsHash: string,
  force: boolean
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store')
  const started = Date.now()
  try {
    const inputs = await avGetJson<CardInputs>(inputsKey(code, inputsHash))
    if (!inputs?.session) {
      res.status(410).json({ success: false, error: 'the session data behind this page has expired, open the session again' })
      return
    }
    const renderKey = sha1(JSON.stringify({ inputsHash, edits, kind, width, height, v: CARD_VERSION })).slice(0, 12)
    const base = `cards/${code}/${kind.replace(/\s+/g, '-')}-${width}x${height}-${renderKey}`
    const pngKey = `${base}.png`
    const jpegKey = `${base}.jpg`

    const session = inputs.session
    const images = new Map<string, string>(Object.entries(inputs.avatars ?? {}))
    const problem = await applyEdits(session, images, edits)
    if (problem) {
      res.status(400).json({ success: false, error: problem })
      return
    }
    const fileName = cardFileName(
      { code: session.sourceId ?? code, title: session.title, start: session.slot_start },
      kind,
      width,
      height
    )

    if (!force) {
      const [hasJpeg, hasPng] = await Promise.all([avObjectExists(jpegKey), avObjectExists(pngKey)])
      if (hasJpeg && hasPng) {
        const head = await fetch(avObjectUrl(jpegKey), { method: 'HEAD', signal: AbortSignal.timeout(3000) }).catch(
          () => null
        )
        const data: StoredCard = {
          png: avObjectUrl(pngKey),
          jpeg: avObjectUrl(jpegKey),
          fileName,
          bytes: Number(head?.headers.get('content-length') ?? 0),
          cached: true,
        }
        res.status(200).json({ success: true, data })
        return
      }
    }

    const { png } = await drawCard(session, images, kind, width, height)
    // Quality 85, as the YouTube thumbnail source.
    const jpeg = await pngToJpeg(png, 85)
    const [pngUrl, jpegUrl] = await Promise.all([
      avPutObject(pngKey, png, 'image/png', CACHE_IMMUTABLE_S),
      avPutObject(jpegKey, jpeg, 'image/jpeg', CACHE_IMMUTABLE_S),
    ])
    console.log(`[av] card ${code} ${kind} ${width}x${height} rendered in ${Date.now() - started} ms`)
    const data: StoredCard = { png: pngUrl, jpeg: jpegUrl, fileName, bytes: jpeg.length, cached: false }
    res.status(200).json({ success: true, data })
  } catch (error) {
    const message = (error as Error).message
    console.error(`[av] card ${code} ${kind} ${width}x${height} failed after ${Date.now() - started} ms:`, message)
    res.status(502).json({ success: false, error: `card render failed: ${message}` })
  }
}

/**
 * One card route's whole handler: password, session code, edits, then the
 * stored mode with `?inputs=<hash>` (`&force=1` draws again even when stored)
 * or the byte mode without it. `authed` when the route checked the password
 * itself already (the Screen Card route validates its size first).
 */
export async function handleCardRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  kind: CardKind,
  width: number,
  height: number,
  authed = false
): Promise<void> {
  // Password-gated (AV_PASSWORD): never cached by the CDN, whose cache key ignores the header.
  res.setHeader('Cache-Control', 'no-store')
  if (!authed && !checkAvAuth(req, res)) return
  const code = String(req.query.code || '').toUpperCase()
  if (!isSessionCode(code)) {
    res.status(400).json({ success: false, error: 'invalid session code' })
    return
  }
  const edits = parseCardEdits(req.query)
  if (typeof edits === 'string') {
    res.status(400).json({ success: false, error: edits })
    return
  }
  const inputs = parseInputsHash(req.query)
  if (inputs) return sendStoredCard(res, code, kind, width, height, edits, inputs, req.query.force === '1')
  return sendFreshCard(res, code, kind, width, height, edits, parseCardFormat(req.query))
}

// ---- byte mode (original behaviour) ----

export async function sendFreshCard(
  res: NextApiResponse,
  code: string,
  kind: CardKind,
  width: number,
  height: number,
  edits: CardEdits = {},
  format: CardFormat = 'jpeg'
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const session = await readSession(code)
    if (!session) {
      res.status(404).json({ success: false, error: `no accepted or confirmed session ${code}` })
      return
    }
    const images = await speakerImageDataUrls(session)
    const problem = await applyEdits(session, images, edits)
    if (problem) {
      res.status(400).json({ success: false, error: problem })
      return
    }
    const { png, fileName } = await drawCard(session, images, kind, width, height)
    res.setHeader('Content-Type', `image/${format}`)
    res.setHeader(
      'Content-Disposition',
      contentDisposition(format === 'png' ? fileName.replace(/\.jpg$/, '.png') : fileName)
    )
    // Quality 85, as the YouTube thumbnail source.
    res.status(200).send(format === 'png' ? png : await pngToJpeg(png, 85))
  } catch (error) {
    console.error(`[av] card ${code} ${width}x${height} failed:`, (error as Error).message)
    res.status(502).json({ success: false, error: 'card render failed' })
  }
}
