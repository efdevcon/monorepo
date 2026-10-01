import type { NextApiRequest, NextApiResponse } from 'next'
import QRCode from 'qrcode'
import { fetchQrRedirects, normaliseSlug, resolveQr } from 'services/qr-redirects'

/**
 * devcon.org/qr/<slug>[/<placement>] → the Target URL of that slug's row in
 * the NocoDB "QR redirects" table, with Matomo parameters appended.
 *
 * Requests arrive here through the middleware, which rewrites /qr/* (with or
 * without a locale prefix) to /api/qr/* so a scan is a single redirect. The
 * 302 is kept in Netlify's durable CDN cache per scanned URL (an hour for a
 * match, a minute for the homepage fallback so a freshly added row shows up
 * quickly) under one tag, which /api/qr/refresh/ purges. No stale-while-
 * revalidate: a purged or expired entry is never served once more. Browsers
 * are told not to keep the redirect, so a re-pointed code also works for
 * someone who scanned it before.
 *
 * With `?svg` the same URL returns the QR code image to print instead of
 * redirecting (`?svg&download` saves it as a file). The image encodes the
 * short devcon.org/qr/ URL, never the destination, so the printed code keeps
 * working when the row is re-pointed. Only slugs that resolve get an image, so
 * a typo cannot end up on a poster.
 */
export const CACHE_TAG = 'qr-redirects'

/** What a scanner reads: the short URL, lower-case, no query string. */
const SITE_ORIGIN = 'https://devcon.org'

/**
 * Print-ready SVG. Vector, so it stays sharp at any size; error correction Q
 * (25 %) survives glare, folds and distance better than the default M at the
 * cost of a few modules, affordable for URLs this short; a 4-module quiet zone
 * as the standard requires; pure black on white for contrast. Scales with the
 * viewBox, so the designer sets the size.
 */
async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'Q',
    margin: 4,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parts = Array.isArray(req.query.path) ? req.query.path : req.query.path ? [req.query.path] : []
  const path = normaliseSlug(parts.join('/'))
  const wantsSvg = 'svg' in req.query
  try {
    const rows = await fetchQrRedirects()
    const hit = resolveQr(path, rows)

    if (wantsSvg) {
      if (!hit.matched) {
        res.setHeader('Cache-Control', 'no-store')
        return res.status(404).send(`No QR redirect for /qr/${path}. Add the row in the NocoDB table first.`)
      }
      const shortUrl = `${SITE_ORIGIN}/qr/${path}`
      const svg = await qrSvg(shortUrl)
      const filename = `devcon-qr-${path.replace(/\//g, '-')}.svg`
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        `${'download' in req.query ? 'attachment' : 'inline'}; filename="${filename}"`
      )
      res.setHeader('Netlify-Cache-Tag', CACHE_TAG)
      res.setHeader('Netlify-CDN-Cache-Control', 'public, durable, s-maxage=86400')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      return res.status(200).send(svg)
    }

    res.setHeader('Netlify-Cache-Tag', CACHE_TAG)
    res.setHeader(
      'Netlify-CDN-Cache-Control',
      hit.matched ? 'public, durable, s-maxage=3600' : 'public, durable, s-maxage=60'
    )
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    res.redirect(302, hit.url)
  } catch (e) {
    // Only reachable for an unexpected bug: fetchQrRedirects degrades to the
    // last good rows or the safety net by itself. Still get the visitor
    // somewhere useful.
    console.error('[api/qr]', (e as Error).message)
    res.setHeader('Cache-Control', 'no-store')
    if (wantsSvg) return res.status(500).send('QR image unavailable right now, try again in a minute.')
    res.redirect(302, 'https://devcon.org/en/?mtm_campaign=qr&mtm_kwd=error')
  }
}
