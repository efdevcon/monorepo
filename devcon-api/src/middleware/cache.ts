import { Request, Response, NextFunction } from 'express'
import onHeaders from 'on-headers'

// Marks public catalog responses as cacheable by Cloudflare (s-maxage) and browsers (max-age).
// Render bills origin egress, so every edge hit is bandwidth we don't pay for. Note: Cloudflare
// only honors these headers for JSON once a Cache Rule marks api.devcon.org as eligible for cache.
// Fail-closed default for Render's "All files" edge caching mode: that mode
// caches every response that carries NO Cache-Control header (120min default
// TTL) — which would freeze side-effect GETs (/regenerate, at-slurper) and
// publicly cache per-user data (devabot threads). Mounted app-wide BEFORE the
// routers, so its on-headers callback runs AFTER any route-level one (the
// wrappers nest LIFO): routes stay uncacheable unless publicCache or the
// handler itself sets an explicit policy.
export const defaultNoStore = (req: Request, res: Response, next: NextFunction) => {
  onHeaders(res, function () {
    if (!this.getHeader('Cache-Control')) this.setHeader('Cache-Control', 'no-store')
  })
  next()
}

export const publicCache = (maxAge: number, staleWhileRevalidate = maxAge * 2) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // HEAD included: curl -I probes otherwise look like caching is off.
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()

    onHeaders(res, function () {
      // Never cache failures, and let handlers that set their own policy win
      if (this.statusCode >= 400 || this.getHeader('Cache-Control')) return

      this.setHeader('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`)
      // Cloudflare ignores `Vary: Origin`, so a cached response would replay one requester's
      // CORS headers to every other origin. These endpoints are public, non-credentialed reads:
      // serve them to any origin instead of echoing the allowlist.
      this.setHeader('Access-Control-Allow-Origin', '*')
      this.removeHeader('Access-Control-Allow-Credentials')
    })

    next()
  }
}
