import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { AV_SCREEN_SIZE_SET, isSessionCode, streamIntroObjectName } from 'services/av/av-assets'
import { avObjectUrl, avPutObject } from 'services/av/storage'

/**
 * Written right after a stream intro landed in the bucket: a small JSON next
 * to the video naming the card it was rendered from (the stored PNG's URL,
 * whose name encodes the session data, the edits and the card version). The
 * page shows a saved video only when that card is the card on screen now, so
 * an edit in Pretalx or on the page never surfaces an outdated intro.
 *
 * POST { code, kind, width, height, card } -> { savedAt }
 */
export interface StreamIntroRecord {
  card: string
  savedAt: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method not allowed' })
  const code = String(req.body?.code || '').toUpperCase()
  const kind = req.body?.kind
  const width = Number(req.body?.width)
  const height = Number(req.body?.height)
  const card = String(req.body?.card || '')
  if (!isSessionCode(code)) return res.status(400).json({ success: false, error: 'invalid session code' })
  const size = `${width}x${height}`
  const sizeOk =
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    ((kind === 'YouTube' && size === '1920x1080') || (kind === 'Screen' && AV_SCREEN_SIZE_SET.has(size)))
  if (!sizeOk) return res.status(400).json({ success: false, error: 'unknown video kind or size' })
  try {
    // Only one of this session's stored cards can be named as the source.
    if (!card.startsWith(avObjectUrl(`cards/${code}/`)) || !card.endsWith('.png'))
      return res.status(400).json({ success: false, error: 'not one of this session’s stored cards' })
    const record: StreamIntroRecord = { card, savedAt: Date.now() }
    const key = `videos/${code}/${streamIntroObjectName(code, kind, width, height).replace(/\.mp4$/, '.json')}`
    await avPutObject(key, Buffer.from(JSON.stringify(record)), 'application/json', 60)
    return res.status(200).json({ success: true, data: { savedAt: record.savedAt } })
  } catch (error) {
    console.error(`[av] video record for ${code} failed:`, (error as Error).message)
    return res.status(502).json({ success: false, error: (error as Error).message })
  }
}
