import type { NextApiRequest, NextApiResponse } from 'next'
import { purgeCache } from '@netlify/functions'
import { fetchNotionLinks, type CampaignLink } from 'services/notion-links'
import { CACHE_TAG } from './index'

/**
 * Uncached companion to /api/links/: fetches Notion fresh, purges the CDN
 * tag on the cached route (pushing edits live for everyone), and confirms.
 *
 * This is a dedicated PATH (not a ?refresh query param) on purpose: Netlify's
 * Next runtime excludes unknown query params from its cache key
 * (netlify-vary: query=__nextDataReq|_rsc), so /api/links/?refresh=1 was
 * served from the same cached object as the plain route. A separate path
 * always reaches origin.
 *
 * Linked from the Notion DB description as the one-click "push live" for
 * editors (browser requests get an HTML confirmation); the ens-page ?preview
 * mode calls it for JSON.
 */
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
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method not allowed' })

  try {
    const links = await fetchNotionLinks()

    // Purge the CDN-cached copy of /api/links/ so everyone gets fresh data.
    // Best-effort: local dev has no purge token, and stale-for-up-to-1h is
    // not an error.
    try {
      await purgeCache({ tags: [CACHE_TAG] })
    } catch (e) {
      console.warn('[api/links/refresh]', 'cache purge skipped:', (e as Error).message)
    }

    if (req.headers.accept?.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(REFRESHED_HTML)
    }
    return res.status(200).json({ success: true, links })
  } catch (e) {
    console.error('[api/links/refresh]', (e as Error).message)
    return res.status(502).json({ success: false, error: 'failed to load links', details: (e as Error).message })
  }
}
