import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { AV_SCREEN_SIZE_SET, isSessionCode, streamIntroObjectName } from 'services/av/av-assets'
import { avSignedUpload, CACHE_SHORT_S } from 'services/av/storage'

/**
 * Where a stream intro rendered on the AV page goes: a signed one-time upload
 * URL into the av-assets bucket, so the browser sends the file to Supabase
 * directly (a function's request body is capped at 6 MB; the videos are 15 to
 * 50 MB). One object per session, kind and size (streamIntroObjectName),
 * overwritten by each render: the link stays the same and plays the latest.
 *
 * POST { code, kind, width, height } -> { uploadUrl, publicUrl, headers }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method not allowed' })
  const code = String(req.body?.code || '').toUpperCase()
  const kind = req.body?.kind
  const width = Number(req.body?.width)
  const height = Number(req.body?.height)
  if (!isSessionCode(code)) return res.status(400).json({ success: false, error: 'invalid session code' })
  const size = `${width}x${height}`
  const sizeOk =
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    ((kind === 'YouTube' && size === '1920x1080') || (kind === 'Screen' && AV_SCREEN_SIZE_SET.has(size)))
  if (!sizeOk) return res.status(400).json({ success: false, error: 'unknown video kind or size' })
  try {
    const signed = await avSignedUpload(`videos/${code}/${streamIntroObjectName(code, kind, width, height)}`)
    return res.status(200).json({
      success: true,
      data: {
        ...signed,
        // What the browser sends with the PUT, so the storage rules live here, not in the page.
        headers: { 'x-upsert': 'true', 'content-type': 'video/mp4', 'cache-control': `max-age=${CACHE_SHORT_S}` },
      },
    })
  } catch (error) {
    console.error(`[av] upload url for ${code} failed:`, (error as Error).message)
    return res.status(502).json({ success: false, error: (error as Error).message })
  }
}
