import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { listAvStageSessions } from 'services/av/pretalx'

// One stage's sessions for the AV page, from the schedule Pretalx is editing
// now. A short browser cache saves reloads; the session itself is always read
// fresh (/api/av/session/<code>/).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Password-gated (AV_PASSWORD): never cached by the CDN, whose cache key ignores the header.
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method not allowed' })
  const id = Number(req.query.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, error: 'invalid stage id' })
  try {
    const sessions = await listAvStageSessions(id)
    res.setHeader('Cache-Control', 'private, max-age=30')
    return res.status(200).json({ success: true, data: sessions })
  } catch (error) {
    console.error(`[av] stage ${id} failed:`, (error as Error).message)
    return res.status(502).json({ success: false, error: 'could not read the stage from Pretalx' })
  }
}
