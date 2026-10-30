import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { isSessionCode } from 'services/av/av-assets'
import { parseCardEdits, parseCardFormat, sendFreshCard } from 'services/av/render'

// YouTube Card (1920x1080), rendered fresh from Pretalx for the AV page,
// with the page's hand edits (?title=, ?speakers=CODE,CODE) applied; ?format=png for an intro video's source.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Password-gated (AV_PASSWORD): never cached by the CDN, whose cache key ignores the header.
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  const code = String(req.query.code || '').toUpperCase()
  if (!isSessionCode(code)) return res.status(400).json({ success: false, error: 'invalid session code' })
  const edits = parseCardEdits(req.query)
  if (typeof edits === 'string') return res.status(400).json({ success: false, error: edits })
  await sendFreshCard(res, code, 'YouTube', 1920, 1080, edits, parseCardFormat(req.query))
}
