import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { isSessionCode, streamIntroObjectName } from 'services/av/av-assets'
import { getAvSession } from 'services/av/pretalx'
import { prepareCardInputs } from 'services/av/render'
import { avObjectUrl } from 'services/av/storage'

// One session for the AV page, read fresh from Pretalx on every call. The same call prepares the
// card renders' inputs (the session in the card's shape plus every speaker photo, stored once in
// the av-assets bucket) and returns their hash as `inputs`, so the six card renders that follow
// read that file instead of each going to Pretalx. When storage is down, `inputs` is null and the
// page renders the old way (bytes straight from Pretalx), so a storage incident costs speed only.
// `videoUrls` are the fixed links of the session's stream intros (one per kind and size); the page
// checks which exist and shows them without a render.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Password-gated (AV_PASSWORD): never cached by the CDN, whose cache key ignores the header.
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method not allowed' })
  const code = String(req.query.code || '').toUpperCase()
  if (!isSessionCode(code)) return res.status(400).json({ success: false, error: 'invalid session code' })
  try {
    const [session, inputs] = await Promise.all([
      getAvSession(code),
      prepareCardInputs(code).catch(error => {
        console.error(`[av] inputs for ${code} not prepared:`, (error as Error).message)
        return null
      }),
    ])
    if (!session) return res.status(404).json({ success: false, error: `no accepted or confirmed session ${code}` })
    const videoUrls: Record<string, string> = {}
    try {
      const sizes: ['YouTube' | 'Screen', number, number][] = [
        ['YouTube', 1920, 1080],
        ...session.screenSizes.map((s): ['Screen', number, number] => {
          const [w, h] = s.split('x').map(Number)
          return ['Screen', w, h]
        }),
      ]
      for (const [kind, w, h] of sizes)
        videoUrls[`${kind}-${w}x${h}`] = avObjectUrl(`videos/${code}/${streamIntroObjectName(code, kind, w, h)}`)
    } catch {
      // No storage URL configured: the page simply never finds a stored video.
    }
    return res.status(200).json({ success: true, data: { ...session, inputs, videoUrls } })
  } catch (error) {
    console.error(`[av] session ${code} failed:`, (error as Error).message)
    return res.status(502).json({ success: false, error: 'could not read the session from Pretalx' })
  }
}
