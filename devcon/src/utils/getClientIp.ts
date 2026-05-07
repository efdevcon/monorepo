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

function pickHeader(req: NextApiRequest, name: string): string {
  const v = req.headers[name]
  if (Array.isArray(v)) return v[0] || ''
  return v || ''
}

export function getClientIp(req: NextApiRequest): string {
  // `x-pretix-buyer-ip` is stamped by our Netlify Edge Function
  // (netlify/edge-functions/inject-client-ip.ts) using `context.ip`, which
  // is Netlify's verified client IP — populated regardless of plugin
  // version. The edge function strips inbound copies, so this header can't
  // be spoofed by the user. Read it FIRST.
  const edgeStamped = pickHeader(req, 'x-pretix-buyer-ip')
  const nfClient = pickHeader(req, 'x-nf-client-connection-ip')
  const cfConnecting = pickHeader(req, 'cf-connecting-ip')
  const trueClient = pickHeader(req, 'true-client-ip')
  const xRealIp = pickHeader(req, 'x-real-ip')
  const xff = pickHeader(req, 'x-forwarded-for')
  const xffFirst = xff ? xff.split(',')[0].trim() : ''
  const socketIp = req.socket?.remoteAddress || ''

  // Order of trust:
  // 1. Edge-stamped `x-pretix-buyer-ip` (our injecting edge function)
  // 2. Netlify's edge-set header (works on plugin versions that forward it)
  // 3. Cloudflare equivalent (when fronting Next.js directly)
  // 4. true-client-ip (Akamai/CF Enterprise convention, similarly authoritative)
  // 5. trusted-proxy XFF (deployments that allowlist the proxy IP explicitly)
  // 6. socket peer (last resort; useful for direct-connect dev, useless on
  //    Lambda where the peer is an internal AWS IP)
  let resolved = ''
  let path = ''
  if (edgeStamped) { resolved = edgeStamped; path = 'edge-stamped' }
  else if (nfClient) { resolved = nfClient; path = 'nf-client' }
  else if (cfConnecting) { resolved = cfConnecting; path = 'cf-connecting' }
  else if (trueClient) { resolved = trueClient; path = 'true-client' }
  else {
    const trusted = (process.env.TRUSTED_PROXIES || '')
      .split(',').map((s) => s.trim()).filter(Boolean)
    if (socketIp && trusted.includes(socketIp) && xffFirst) {
      resolved = xffFirst; path = 'trusted-xff'
    } else {
      resolved = socketIp; path = 'socket'
    }
  }

  // DIAGNOSTIC — log every IP-resolution decision with all candidate headers,
  // so when something forwards the wrong IP (e.g. Lambda's internal peer
  // instead of the buyer's real IP) we can see exactly what was on offer.
  // Revert to a quieter level once the deployment topology is understood.
  if (process.env.GET_CLIENT_IP_DEBUG !== 'off') {
    // eslint-disable-next-line no-console
    console.info(
      '[getClientIp]',
      JSON.stringify({
        resolved, path,
        edgeStamped: edgeStamped || '-',
        nfClient: nfClient || '-',
        cfConnecting: cfConnecting || '-',
        trueClient: trueClient || '-',
        xRealIp: xRealIp || '-',
        xff: xff || '-',
        xffFirst: xffFirst || '-',
        socketIp: socketIp || '-',
        url: req.url,
      }),
    )
  }

  return resolved || 'unknown'
}
