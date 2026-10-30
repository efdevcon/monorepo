import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { getOfficialSpeakers } from 'services/av/pretalx'

// The official speaker list (speakers on confirmed sessions) for the AV page's card editor.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Password-gated (AV_PASSWORD): never cached by the CDN, whose cache key ignores the header.
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method not allowed' })
  try {
    const speakers = [...(await getOfficialSpeakers()).values()]
      .map(({ code, name }) => ({ code, name }))
      .filter(s => s.name)
      .sort((a, b) => a.name.localeCompare(b.name))
    res.setHeader('Cache-Control', 'private, max-age=300')
    return res.status(200).json({ success: true, data: speakers })
  } catch (error) {
    console.error('[av] speakers failed:', (error as Error).message)
    return res.status(502).json({ success: false, error: 'could not read the speakers from Pretalx' })
  }
}
