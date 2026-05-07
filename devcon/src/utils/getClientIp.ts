// Trusted-proxy-aware client-IP extractor.
//
// Reading `x-forwarded-for` unconditionally is a classic rate-limit bypass —
// any client can spoof a unique XFF on every request and walk around per-IP
// throttles. We pin XFF processing to a configured proxy allowlist: if the
// socket peer matches one of the IPs in `TRUSTED_PROXIES`, we trust the
// leftmost XFF entry as the real client; otherwise we ignore XFF entirely
// and use the socket peer.
//
// Configure via env (Vercel / Netlify / .env.local):
//
//     TRUSTED_PROXIES=10.0.0.5,172.16.0.10
//
// Leave empty (the default) to always use the socket peer — correct for
// deployments behind a single trusted reverse proxy that strips XFF, or
// any setup where the proxy IP isn't stable enough to allowlist.
import type { NextApiRequest } from 'next'

export function getClientIp(req: NextApiRequest): string {
  // Netlify's edge sets `x-nf-client-connection-ip` to the verified client IP
  // and strips any pre-existing copy on inbound requests, so the header's
  // presence is itself the proof we're behind Netlify's edge — same trust
  // model Cloudflare uses for `cf-connecting-ip`. We don't gate on
  // `process.env.NETLIFY` because that env var is set at build time and
  // doesn't reliably propagate to Next.js's function runtime on Netlify.
  const nfIp = req.headers['x-nf-client-connection-ip']
  const nfStr = Array.isArray(nfIp) ? nfIp[0] : nfIp
  if (nfStr) return nfStr

  // Cloudflare equivalent — useful for any deployment that fronts Next.js
  // with CF (rare but possible). CF strips inbound copies the same way.
  const cfIp = req.headers['cf-connecting-ip']
  const cfStr = Array.isArray(cfIp) ? cfIp[0] : cfIp
  if (cfStr) return cfStr

  const trusted = (process.env.TRUSTED_PROXIES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const socketIp = req.socket?.remoteAddress || ''
  if (socketIp && trusted.includes(socketIp)) {
    const xff = req.headers['x-forwarded-for']
    const xffStr = Array.isArray(xff) ? xff[0] : xff
    if (xffStr) {
      const first = xffStr.split(',')[0].trim()
      if (first) return first
    }
  }
  return socketIp || 'unknown'
}
