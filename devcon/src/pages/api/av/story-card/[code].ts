import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { isSessionCode } from 'services/av/av-assets'
import { parseCardEdits, parseCardFormat, sendFreshCard } from 'services/av/render'

// Instagram Story (1080x1920, the portrait layout), rendered fresh from Pretalx for the AV page,
// with the page's hand edits (?title=, ?speakers=CODE,CODE) applied.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Password-gated (AV_PASSWORD): never cached by the CDN, whose cache key ignores the header.
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  const code = String(req.query.code || '').toUpperCase()
  if (!isSessionCode(code)) return res.status(400).json({ success: false, error: 'invalid session code' })
  const edits = parseCardEdits(req.query)
  if (typeof edits === 'string') return res.status(400).json({ success: false, error: edits })
  await sendFreshCard(res, code, 'Story', 1080, 1920, edits, parseCardFormat(req.query))
}
