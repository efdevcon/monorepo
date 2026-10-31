/**
 * Fresh AV renders for the AV page: the same Devcon 8 card the nightly job
 * fetches from /api/social/av/ and /api/social/av-screen/, but read straight
 * from Pretalx and never served from the card cache, so a last-minute edit
 * in Pretalx is on the next render.
 */
import type { NextApiResponse } from 'next'
import { poppinsFonts } from 'services/social-cards/assets'
import { renderDc8SocialCard, renderDc8StoryCard } from 'services/social-cards/dc8-social-card'
import { getSessionFromPretalx, speakerImageDataUrls } from 'services/social-cards/data'
import { getOfficialSpeakers, hardcodedSlot } from './pretalx'
import { pngToJpeg } from 'services/og-cache'
import { AV_EVENT_ID, cardFileName, contentDisposition, isSessionCode } from './av-assets'

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
    const session = await getSessionFromPretalx(code)
    if (!session || session.eventId !== AV_EVENT_ID) {
      res.status(404).json({ success: false, error: `no accepted or confirmed session ${code}` })
      return
    }
    // A session with no Pretalx slot but a hardcoded one: its time goes in the file name (and the Story).
    if (!session.slot_start) {
      const slot = hardcodedSlot(code)
      session.slot_start = slot?.start ?? null
      if (slot && !session.slot_room) session.slot_room = { name: slot.room }
    }
    if (edits.title) session.title = edits.title
    if (edits.speakerCodes) {
      // Only speakers on the official list: the card never shows a name Pretalx does not have.
      const official = await getOfficialSpeakers()
      const unknown = edits.speakerCodes.filter(c => !official.has(c))
      if (unknown.length) {
        res.status(400).json({ success: false, error: `not on the official speaker list: ${unknown.join(', ')}` })
        return
      }
      session.speakers = edits.speakerCodes.map(c => {
        const sp = official.get(c)!
        return { id: sp.code, name: sp.name, avatar: sp.avatar }
      })
    }
    const images = await speakerImageDataUrls(session)
    const card =
      kind === 'Story'
        ? renderDc8StoryCard(session, images, poppinsFonts(), { width, height })
        : renderDc8SocialCard(session, images, poppinsFonts(), { width, height }, { showSlot: kind === 'Social Time' })
    const png = await card.arrayBuffer()
    const fileName = cardFileName(
      { code: session.sourceId ?? code, title: session.title, start: session.slot_start },
      kind,
      width,
      height
    )
    res.setHeader('Content-Type', `image/${format}`)
    res.setHeader(
      'Content-Disposition',
      contentDisposition(format === 'png' ? fileName.replace(/\.jpg$/, '.png') : fileName)
    )
    // Quality 85, as the YouTube thumbnail source.
    res.status(200).send(format === 'png' ? Buffer.from(png) : await pngToJpeg(png, 85))
  } catch (error) {
    console.error(`[av] card ${code} ${width}x${height} failed:`, (error as Error).message)
    res.status(502).json({ success: false, error: 'card render failed' })
  }
}
