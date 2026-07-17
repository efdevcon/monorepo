import type { NextApiRequest, NextApiResponse } from 'next'
import { Readable } from 'stream'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
}

// Only NocoDB's own time-limited signed download paths are accepted. Raw
// `download/...` paths are refused — they'd require lending the xc-token,
// which would turn the proxy into a generic authenticated NocoDB-API gateway
// if combined with a path-traversal payload.
const ALLOWED_PATH_PREFIX = '/dltemp/'

// Content types we'll render inline. Everything else is forced to download as
// an attachment so an `evil.html` upload can't execute JS in our origin.
const INLINE_SAFE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
])

function buildTargetUrl(rawUrl: string | undefined, rawPath: string | undefined, nocodbBaseUrl: string):
  | { ok: true; url: string }
  | { ok: false; status: number; error: string } {
  const baseParsed = new URL(nocodbBaseUrl)

  if (typeof rawUrl === 'string' && rawUrl) {
    try {
      const parsed = new URL(rawUrl)
      if (parsed.host !== baseParsed.host) {
        return { ok: false, status: 400, error: 'URL host not allowed' }
      }
      if (!parsed.pathname.startsWith(ALLOWED_PATH_PREFIX)) {
        return { ok: false, status: 400, error: 'URL path not allowed' }
      }
      return { ok: true, url: parsed.toString() }
    } catch {
      return { ok: false, status: 400, error: 'Invalid url' }
    }
  }

  if (typeof rawPath === 'string' && rawPath) {
    // Hard-reject any traversal characters before doing anything else.
    if (rawPath.includes('..') || rawPath.includes('\\') || rawPath.includes('\0')) {
      return { ok: false, status: 400, error: 'Path not allowed' }
    }
    // Resolve via the URL constructor so we validate the *normalized* pathname,
    // not the raw string — defends against tricks the prefix check would miss.
    let resolved: URL
    try {
      resolved = new URL(rawPath, baseParsed)
    } catch {
      return { ok: false, status: 400, error: 'Invalid path' }
    }
    if (resolved.host !== baseParsed.host) {
      return { ok: false, status: 400, error: 'Path resolved off-host' }
    }
    if (!resolved.pathname.startsWith(ALLOWED_PATH_PREFIX)) {
      return { ok: false, status: 400, error: 'Path not allowed' }
    }
    return { ok: true, url: resolved.toString() }
  }

  return { ok: false, status: 400, error: 'Missing url or path' }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  const nocodbBaseUrl = process.env.NOCODB_BASE_URL
  if (!nocodbBaseUrl) {
    return res.status(500).json({ success: false, error: 'NocoDB not configured' })
  }

  const { url, path, filename } = req.query

  const target = buildTargetUrl(
    typeof url === 'string' ? url : undefined,
    typeof path === 'string' ? path : undefined,
    nocodbBaseUrl
  )
  if (!target.ok) {
    return res.status(target.status).json({ success: false, error: target.error })
  }

  try {
    // No xc-token on the request: dltemp URLs carry their own short-lived
    // signature, so the proxy never lends NocoDB-admin credentials.
    const upstream = await fetch(target.url)
    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).json({ success: false, error: 'Fetch failed' })
    }

    const contentType = (upstream.headers.get('content-type') || 'application/octet-stream').toLowerCase()
    const baseType = contentType.split(';')[0].trim()
    const contentLength = upstream.headers.get('content-length')

    res.setHeader('Content-Type', contentType)
    if (contentLength) res.setHeader('Content-Length', contentLength)
    res.setHeader('Cache-Control', 'private, max-age=300')
    // Stop the browser from sniffing a different MIME than we declare.
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // Force `attachment` unless the upstream is something we're confident the
    // browser will render safely (images, PDF). HTML/SVG/JS therefore always
    // download instead of executing in this origin.
    const safeInline = INLINE_SAFE_TYPES.has(baseType)
    const disposition = safeInline ? 'inline' : 'attachment'
    const safeName = typeof filename === 'string' && filename ? filename.replace(/[\r\n"\\]/g, '') : 'file'
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`)

    const nodeStream = Readable.fromWeb(upstream.body as any)
    nodeStream.pipe(res)
    nodeStream.on('error', err => {
      console.error('[nocodb/file] stream error', err)
      res.end()
    })
  } catch (err) {
    console.error('[nocodb/file]', err)
    return res.status(500).json({ success: false, error: 'Proxy failed' })
  }
}
