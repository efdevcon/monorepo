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

/** Per-event toggle state returned by `/plugin/x402/settings/`. Both flags
 *  default OFF if the plugin doesn't ship the field yet (older deploy),
 *  so the storefront fails closed on the gated paths. */
export interface PluginSettings {
  x402_enabled: boolean
  fiat_purchase_enabled: boolean
}

/** Short-TTL in-memory cache for the per-event settings lookup. A 10s
 *  window lets admin toggle flips propagate quickly while keeping the
 *  per-request cost effectively free on the storefront's hot path. */
const _settingsCache: { value: PluginSettings | null; expiresAt: number } = {
  value: null,
  expiresAt: 0,
}
const SETTINGS_CACHE_TTL_MS = 10_000

/**
 * Read the per-event admin toggles (x402_enabled + fiat_purchase_enabled)
 * from the plugin. Used by `/api/x402/tickets/fiat-purchase` to gate the
 * external-API purchase path behind a per-event flag (M18–M22 follow-up;
 * default OFF for the v1 launch posture).
 *
 * Fails closed on any error — if the plugin is unreachable, the settings
 * call errors out, or the response is malformed, returns both flags as
 * `false`. Better to over-block than to over-permit during launch.
 */
export async function getPluginSettings(): Promise<PluginSettings> {
  const now = Date.now()
  if (_settingsCache.value && now < _settingsCache.expiresAt) {
    return _settingsCache.value
  }
  try {
    const { status, body } = await pluginFetch<Partial<PluginSettings> & { success?: boolean; error?: string }>(
      '/plugin/x402/settings/',
      { method: 'GET' },
    )
    if (status !== 200 || typeof body !== 'object' || body === null) {
      console.warn(`[x402 settings] non-200 from plugin (status=${status}); failing closed`)
      const failClosed: PluginSettings = { x402_enabled: false, fiat_purchase_enabled: false }
      _settingsCache.value = failClosed
      _settingsCache.expiresAt = now + SETTINGS_CACHE_TTL_MS
      return failClosed
    }
    const resolved: PluginSettings = {
      x402_enabled: body.x402_enabled === true,
      fiat_purchase_enabled: body.fiat_purchase_enabled === true,
    }
    _settingsCache.value = resolved
    _settingsCache.expiresAt = now + SETTINGS_CACHE_TTL_MS
    return resolved
  } catch (e) {
    console.warn('[x402 settings] error fetching settings; failing closed:', e)
    return { x402_enabled: false, fiat_purchase_enabled: false }
  }
}
