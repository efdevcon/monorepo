import type { NextApiRequest, NextApiResponse } from 'next'
import { purgeCache } from '@netlify/functions'
import { fetchNotionLinks, type CampaignLink } from 'services/notion-links'

/**
 * Campaign links for the ens-page at devcon.eth.limo.
 *
 * Source of truth is a Notion database managed by comms; the Netlify CDN
 * caches this response for an hour (s-maxage + Netlify-Cache-Tag), so Notion
 * edits go live within ~1h with no clicks. `?refresh=1` fetches fresh AND
 * purges the CDN tag, pushing the edits live for everyone immediately: that
 * URL is linked from the Notion database description as a one-click
 * "publish now" for editors, so browser requests get a small HTML
 * confirmation instead of JSON.
 */
const CACHE_TAG = 'ens-links'

const REFRESHED_HTML = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Devcon links refreshed</title>
<body style="font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 90vh; margin: 0">
  <div style="text-align: center">
    <div style="font-size: 3rem">&#9989;</div>
    <h1 style="font-size: 1.25rem">Links refreshed</h1>
    <p style="color: #666">Your Notion edits are now live on the ENS page.</p>
  </div>
</body>`

type ResponseBody = { success: true; links: CampaignLink[] } | { success: false; error: string; details?: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody | string>) {
  // Callers live on eth.limo / IPFS gateway origins; the data is public.
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method not allowed' })

  try {
    const links = await fetchNotionLinks()

    if ('refresh' in req.query) {
      // Purge the CDN-cached copy so the next plain request serves fresh
      // data to everyone. Best-effort: purging needs the Netlify runtime
      // (local dev has no purge token) and a stale cache is not an error.
      try {
        await purgeCache({ tags: [CACHE_TAG] })
      } catch (e) {
        console.warn('[api/links] cache purge skipped:', (e as Error).message)
      }
      res.setHeader('Cache-Control', 'no-store')
      if (req.headers.accept?.includes('text/html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        return res.status(200).send(REFRESHED_HTML)
      }
      return res.status(200).json({ success: true, links })
    }

    res.setHeader('Netlify-Cache-Tag', CACHE_TAG)
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json({ success: true, links })
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store') // never cache failures
    console.error('[api/links]', (e as Error).message)
    return res.status(502).json({ success: false, error: 'failed to load links', details: (e as Error).message })
  }
}
