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
  // Netlify (functions runtime sets NETLIFY=true) injects the verified client
  // IP via `x-nf-client-connection-ip`. Their edge overwrites the header on
  // every request, so it cannot be spoofed by the user — preferred over
  // generic XFF allowlisting because Netlify's internal proxy IPs aren't
  // stable enough to enumerate in a TRUSTED_PROXIES list.
  if (process.env.NETLIFY === 'true') {
    const nfIp = req.headers['x-nf-client-connection-ip']
    const nfStr = Array.isArray(nfIp) ? nfIp[0] : nfIp
    if (nfStr) return nfStr
  }

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
