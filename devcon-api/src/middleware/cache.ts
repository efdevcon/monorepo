import { Request, Response, NextFunction } from 'express'
import onHeaders from 'on-headers'

// Marks public catalog responses as cacheable by Cloudflare (s-maxage) and browsers (max-age).
// Render bills origin egress, so every edge hit is bandwidth we don't pay for. Note: Cloudflare
// only honors these headers for JSON once a Cache Rule marks api.devcon.org as eligible for cache.
export const publicCache = (maxAge: number, staleWhileRevalidate = maxAge * 2) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next()

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
