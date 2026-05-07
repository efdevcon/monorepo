import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Dev-only proxy for fetching the avatar-test thumbnail bytes without hitting
 * cross-origin CORS errors (i.pravatar.cc doesn't send CORS headers, so the
 * browser can render <img> but can't fetch() the bytes).
 *
 * Disabled in production to avoid shipping an open image fetcher.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }

  const url = typeof req.query.url === 'string' ? req.query.url : null
  if (!url) {
    return res.status(400).json({ error: 'url query param required' })
  }

  // Only allow a small set of known test-image hosts so this can't be abused
  // as a generic SSRF, even in dev.
  const ALLOWED_HOSTS = new Set(['i.pravatar.cc', 'images.unsplash.com', 'picsum.photos'])
  let host: string
  try {
    host = new URL(url).host
  } catch {
    return res.status(400).json({ error: 'invalid url' })
  }
  if (!ALLOWED_HOSTS.has(host)) {
    return res.status(403).json({ error: `host not allowed: ${host}` })
  }

  try {
    const upstream = await fetch(url)
    if (!upstream.ok) {
      return res.status(502).json({ error: `upstream ${upstream.status}` })
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.status(200).send(buffer)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'proxy failed' })
  }
}
