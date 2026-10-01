import type { NextApiRequest, NextApiResponse } from 'next'
import { purgeCache } from '@netlify/functions'
import { fetchQrRedirects, type QrRedirect } from 'services/qr-redirects'
import { CACHE_TAG } from './[[...path]]'

/**
 * "Push live" for the QR table: re-reads NocoDB and purges every cached /qr/
 * redirect, so an edited row takes effect at once. Called by the NocoDB
 * webhooks on every row change, and usable by hand; browsers get an HTML
 * confirmation, scripts get JSON. Same shape as /api/links/refresh/.
 */
const REFRESHED_HTML = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QR redirects refreshed</title>
<body style="font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 90vh; margin: 0">
  <div style="text-align: center">
    <div style="font-size: 3rem">&#9989;</div>
    <h1 style="font-size: 1.25rem">QR redirects refreshed</h1>
    <p style="color: #666">Your NocoDB edits are live on devcon.org/qr/.</p>
  </div>
</body>`

type ResponseBody = { success: true; redirects: QrRedirect[] } | { success: false; error: string; details?: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody | string>) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method not allowed' })
  try {
    const redirects = await fetchQrRedirects(true)
    try {
      await purgeCache({ tags: [CACHE_TAG] })
    } catch (e) {
      console.warn('[api/qr/refresh]', 'cache purge skipped:', (e as Error).message)
    }
    if (req.headers.accept?.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(REFRESHED_HTML)
    }
    return res.status(200).json({ success: true, redirects })
  } catch (e) {
    console.error('[api/qr/refresh]', (e as Error).message)
    return res.status(502).json({ success: false, error: 'failed to load QR redirects', details: (e as Error).message })
  }
}
