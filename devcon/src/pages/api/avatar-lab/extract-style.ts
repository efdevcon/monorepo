import type { NextApiRequest, NextApiResponse } from 'next'
import { Source, extractStyle, isLabEnabled, resolveSource } from 'services/avatar-lab'

export const config = {
  api: {
    bodyParser: { sizeLimit: '30mb' },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isLabEnabled()) return res.status(404).json({ success: false, error: 'Not found' })

  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }

  const { sources } = req.body ?? {}
  if (!Array.isArray(sources) || sources.length === 0 || sources.length > 12) {
    return res.status(400).json({ success: false, error: 'sources must be 1-12 entries' })
  }

  try {
    const resolved = await Promise.all((sources as Source[]).map(s => resolveSource(s)))
    const style = await extractStyle(resolved.map(r => ({ base64: r.base64, mime: r.mime })))
    return res.status(200).json({ success: true, style, count: resolved.length })
  } catch (err) {
    console.error('[avatar-lab/extract-style]', err)
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
}
