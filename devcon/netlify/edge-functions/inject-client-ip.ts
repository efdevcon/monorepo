// Stamp the buyer's verified client IP into a custom header that downstream
// Next.js API routes can read, regardless of how the @netlify/plugin-nextjs
// version forwards (or fails to forward) Netlify's standard headers.
//
// Why this exists:
//   On Next.js 16 + @netlify/plugin-nextjs v5, Netlify's edge-stamped
//   `x-nf-client-connection-ip` header doesn't reliably reach the Next.js
//   API-route function — `req.socket.remoteAddress` returns the Lambda's
//   internal peer (an AWS-egress IP) and the buyer's true IP is lost.
//   This means rate limits attribute everything to a handful of egress IPs
//   instead of the actual buyer.
//
//   Edge Functions, in contrast, have direct access to `context.ip` — a
//   verified client IP populated by Netlify regardless of plugin version.
//   We rewrite the request with our own `x-pretix-buyer-ip` header set
//   from `context.ip`, and `getClientIp(req)` in the Next.js layer reads
//   that header first.
//
// Anti-spoof:
//   We delete any inbound copy of `x-pretix-buyer-ip` before setting it.
//   Only this edge function — which runs before any user-controllable code
//   on the request path — can stamp the header, so an attacker cannot
//   forge it.

import type { Context } from '@netlify/edge-functions'

export default async (request: Request, context: Context) => {
  const headers = new Headers(request.headers)
  headers.delete('x-pretix-buyer-ip')
  if (context.ip) {
    headers.set('x-pretix-buyer-ip', context.ip)
  }
  // Forward to the next handler (Next.js API route) with the modified
  // headers. Netlify's runtime accepts a Request override on context.next().
  return context.next(new Request(request, { headers }))
}
