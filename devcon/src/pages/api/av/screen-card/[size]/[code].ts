import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { AV_SCREEN_SIZE_SET, isSessionCode } from 'services/av/av-assets'
import { parseCardEdits, parseCardFormat, sendFreshCard } from 'services/av/render'

// Screen Card at a stage screen's native size, rendered fresh from Pretalx for the AV page,
// with the page's hand edits (?title=, ?speakers=CODE,CODE) applied; ?format=png for an intro video's source.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Password-gated (AV_PASSWORD): never cached by the CDN, whose cache key ignores the header.
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  const code = String(req.query.code || '').toUpperCase()
  const size = String(req.query.size || '')
  if (!isSessionCode(code)) return res.status(400).json({ success: false, error: 'invalid session code' })
  if (!AV_SCREEN_SIZE_SET.has(size)) {
    return res
      .status(400)
      .json({ success: false, error: `unknown screen size, one of ${[...AV_SCREEN_SIZE_SET].join(', ')}` })
  }
  const [width, height] = size.split('x').map(Number)
  const edits = parseCardEdits(req.query)
  if (typeof edits === 'string') return res.status(400).json({ success: false, error: edits })
  await sendFreshCard(res, code, 'Screen', width, height, edits, parseCardFormat(req.query))
}
