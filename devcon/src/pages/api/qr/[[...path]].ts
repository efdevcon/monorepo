import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchQrRedirects, resolveQr } from 'services/qr-redirects'

/**
 * devcon.org/qr/<slug>[/<placement>] → the Target URL of that slug's row in
 * the NocoDB "QR-code redirect" table, with Matomo parameters appended.
 *
 * Requests arrive here through the middleware, which rewrites /qr/* (with or
 * without a locale prefix) to /api/qr/* so a scan is a single redirect. The
 * 302 is kept in Netlify's durable CDN cache per scanned URL (an hour for a
 * match, a minute for the homepage fallback so a freshly added row shows up
 * quickly) under one tag, which /api/qr/refresh/ purges. No stale-while-
 * revalidate: a purged or expired entry is never served once more. Browsers
 * are told not to keep the redirect, so a re-pointed code also works for
 * someone who scanned it before.
 */
export const CACHE_TAG = 'qr-redirects'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parts = Array.isArray(req.query.path) ? req.query.path : req.query.path ? [req.query.path] : []
  const path = parts.join('/')
  try {
    const rows = await fetchQrRedirects()
    const hit = resolveQr(path, rows)
    res.setHeader('Netlify-Cache-Tag', CACHE_TAG)
    res.setHeader(
      'Netlify-CDN-Cache-Control',
      hit.matched ? 'public, durable, s-maxage=3600' : 'public, durable, s-maxage=60'
    )
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    res.redirect(302, hit.url)
  } catch (e) {
    // Only reachable for an unexpected bug: fetchQrRedirects degrades to stale
    // rows or the safety net by itself. Still get the visitor somewhere useful.
    console.error('[api/qr]', (e as Error).message)
    res.setHeader('Cache-Control', 'no-store')
    res.redirect(302, 'https://devcon.org/en/?mtm_campaign=qr&mtm_kwd=error')
  }
}
