import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { isSessionCode } from 'services/av/av-assets'
import { getAvSession } from 'services/av/pretalx'

// One session for the AV page, read fresh from Pretalx on every call.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Password-gated (AV_PASSWORD): never cached by the CDN, whose cache key ignores the header.
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method not allowed' })
  const code = String(req.query.code || '').toUpperCase()
  if (!isSessionCode(code)) return res.status(400).json({ success: false, error: 'invalid session code' })
  try {
    const session = await getAvSession(code)
    if (!session) return res.status(404).json({ success: false, error: `no accepted or confirmed session ${code}` })
    return res.status(200).json({ success: true, data: session })
  } catch (error) {
    console.error(`[av] session ${code} failed:`, (error as Error).message)
    return res.status(502).json({ success: false, error: 'could not read the session from Pretalx' })
  }
}
