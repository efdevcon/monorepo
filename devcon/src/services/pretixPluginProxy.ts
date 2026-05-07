/**
 * Thin wrapper that forwards API requests from devcon-next to the Pretix
 * plugin (x402 backend lives there now; Supabase is retired).
 *
 * Auth uses the same Pretix API token already configured for order management.
 * No extra shared secret needed.
 */
import { TICKETING, getPretixApiToken } from 'config/ticketing'

const BASE_URL = TICKETING.pretix.baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')

export async function pluginFetch<T = unknown>(
  path: string,
  init: {
    method: 'GET' | 'POST'
    body?: Record<string, unknown>
    /** Buyer's true client IP, captured at the proxy edge via `getClientIp`.
     *  Forwarded to the plugin as `X-Forwarded-For` so the plugin's
     *  per-buyer rate limiter sees the real IP instead of the Next.js
     *  server's. The plugin only honors XFF when the proxy's IP is in its
     *  PRETIX_ETH_TRUSTED_PROXIES allowlist — configure both sides. */
    clientIp?: string
  } = { method: 'GET' },
): Promise<{ status: number; body: T }> {
  const url = new URL(path, BASE_URL)
  if (init.method === 'GET') {
    url.searchParams.set('organizer', TICKETING.pretix.organizer)
    url.searchParams.set('event', TICKETING.pretix.event)
  }

  const body =
    init.method === 'POST'
      ? JSON.stringify({
          ...(init.body || {}),
          organizer: TICKETING.pretix.organizer,
          event: TICKETING.pretix.event,
        })
      : undefined

  const token = getPretixApiToken()

  const headers: Record<string, string> = {
    Authorization: `Token ${token}`,
  }
  if (init.clientIp && init.clientIp !== 'unknown') {
    // Cloudflare (in front of the pretix backend) overwrites `X-Forwarded-For`
    // with its own view of the connection — i.e. our Netlify egress IP — so
    // a vanilla XFF doesn't survive the trip. Custom `X-…` headers pass
    // through Cloudflare unchanged, so we use a private one. The plugin's
    // `get_client_ip` reads it first when the request is token-authenticated.
    // We still set XFF too as a fallback for deployments without Cloudflare.
    headers['X-Pretix-Buyer-Ip'] = init.clientIp
    headers['X-Forwarded-For'] = init.clientIp
  }
  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(url.toString(), {
      method: init.method,
      headers,
      body,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const parsed = (await res.json().catch(() => ({ success: false, error: 'Non-JSON response from plugin' }))) as T
    if (res.status >= 400) {
      console.error(`[x402 proxy] ${init.method} ${path} -> ${res.status}`, parsed)
    }
    return { status: res.status, body: parsed }
  } catch (e) {
    clearTimeout(timeout)
    const msg = e instanceof Error && e.name === 'AbortError'
      ? 'Pretix plugin request timed out (15s)'
      : `Pretix plugin unreachable: ${(e as Error).message}`
    console.error(`[x402 proxy] ${init.method} ${path} failed:`, msg)
    return { status: 502, body: { success: false, error: msg } as unknown as T }
  }
}
