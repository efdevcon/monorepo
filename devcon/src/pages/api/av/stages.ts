import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { getAvStages } from 'services/av/pretalx'

// The stages and event days for the AV page's first screen, from Pretalx.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Password-gated (AV_PASSWORD): never cached by the CDN, whose cache key ignores the header.
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method not allowed' })
  try {
    const data = await getAvStages()
    res.setHeader('Cache-Control', 'private, max-age=300')
    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('[av] stages failed:', (error as Error).message)
    return res.status(502).json({ success: false, error: 'could not read the stages from Pretalx' })
  }
}
