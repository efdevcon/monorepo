import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchNotionLinks, type CampaignLink } from 'services/notion-links'

/**
 * Read-only uncached view of the Notion links: always fetches fresh, never
 * touches the CDN cache of /api/links/. Backs the ens-page's ?preview mode,
 * so editors can check their Notion edits without publishing them to every
 * visitor (that's /api/links/refresh/, which purges the cache tag).
 *
 * Separate path rather than a query param because Netlify's CDN excludes
 * unknown query params from the cache key (see refresh.ts).
 */
type ResponseBody = { success: true; links: CampaignLink[] } | { success: false; error: string; details?: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method not allowed' })

  try {
    const links = await fetchNotionLinks()
    return res.status(200).json({ success: true, links })
  } catch (e) {
    console.error('[api/links/preview]', (e as Error).message)
    return res.status(502).json({ success: false, error: 'failed to load links', details: (e as Error).message })
  }
}
