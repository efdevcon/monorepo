import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchNotionLinks, type CampaignLink } from 'services/notion-links'

/**
 * Campaign links for the ens-page at devcon.eth.limo.
 *
 * Source of truth is a Notion database managed by comms; the Netlify CDN
 * caches this response for an hour (s-maxage), so Notion edits go live
 * within ~1h with no clicks. `?refresh=1` is a distinct cache key that
 * always hits origin, for instant verification after an edit.
 */
type ResponseBody = { success: true; links: CampaignLink[] } | { success: false; error: string; details?: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  // Callers live on eth.limo / IPFS gateway origins; the data is public.
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method not allowed' })

  try {
    const links = await fetchNotionLinks()
    res.setHeader(
      'Cache-Control',
      'refresh' in req.query ? 'no-store' : 'public, s-maxage=3600, stale-while-revalidate=86400'
    )
    return res.status(200).json({ success: true, links })
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store') // never cache failures
    console.error('[api/links]', (e as Error).message)
    return res.status(502).json({ success: false, error: 'failed to load links', details: (e as Error).message })
  }
}
