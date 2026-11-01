import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { AV_SCREEN_SIZE_SET } from 'services/av/av-assets'
import { handleCardRequest } from 'services/av/render'

// Screen Card at a stage screen's native size for the AV page, with the page's hand edits
// (?title=, ?speakers=CODE,CODE) applied. With ?inputs=<hash> it renders from the stored session data
// into the av-assets bucket and answers the CDN links (services/av/render.ts); without it, the image itself.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Password-gated (AV_PASSWORD): never cached by the CDN, whose cache key ignores the header.
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  const size = String(req.query.size || '')
  if (!AV_SCREEN_SIZE_SET.has(size)) {
    return res
      .status(400)
      .json({ success: false, error: `unknown screen size, one of ${[...AV_SCREEN_SIZE_SET].join(', ')}` })
  }
  const [width, height] = size.split('x').map(Number)
  await handleCardRequest(req, res, 'Screen', width, height, true)
}
