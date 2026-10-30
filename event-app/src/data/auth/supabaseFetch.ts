import { SUPABASE_PROXY_PATH } from "./supabaseProxy";

/**
 * `fetch` for the app's Supabase client. Two jobs, both about keeping people
 * signed in on a venue network:
 *
 * 1. Proxy fallback. The browser talks to supabase.co directly and, only when
 *    that fails on the network, repeats the request through the same-origin
 *    proxy (SUPABASE_PROXY_PATH, the rule in netlify.toml), the other way
 *    round once the proxy was needed. Same method, headers and body: the
 *    client sends strings, blobs and form data, which a second attempt can
 *    send again (a stream cannot be). The proxied request is same-origin, so
 *    it goes without credentials: the app's own cookies (the auth mirror
 *    among them) have no business at Supabase. Only the paths the proxy rule
 *    forwards (keep PROXIED_PREFIXES in step with netlify.toml).
 *
 * 2. Rate-limited refreshes stay refreshable. Supabase limits the token
 *    endpoint per source address, and a venue puts thousands of devices
 *    behind a few. auth-js treats any refresh failure other than a network
 *    error or a 5xx as final and drops the session on the spot, so a 429 at
 *    a busy moment would sign out everyone past the limit at once. A 429
 *    from the token endpoint is therefore handed back as a 503, which
 *    auth-js retries with backoff and again on its next tick, keeping the
 *    stored session (useUser keeps showing the remembered user meanwhile).
 *    A 429 is never a reason to try the proxy: it would move the whole
 *    venue's refreshes onto the proxy's addresses. Only the token endpoint:
 *    a rate-limited code check must reach the sign-in form as what it is.
 *
 * A factory so scripts/test-data.ts can drive it with a stubbed fetch.
 */
export interface SupabaseFetchOptions {
  /** Origin of the Supabase project; null when auth is not configured (everything then goes out as is). */
  supabaseOrigin: string | null;
  /** The page's own origin and href at call time; null outside a browser (no proxy, no softening). */
  location: () => { origin: string; href: string } | null;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  /** The route just switched to the proxy; `service` is `auth/v1` or `storage/v1`. */
  onProxy?: (service: string) => void;
  /** A token refresh was rate limited (and softened). */
  onRateLimited?: () => void;
}

/** The paths the proxy rule forwards: auth, and the signed uploads of the feedback form. */
const PROXIED_PREFIXES = ["/auth/v1/", "/storage/v1/object/upload/sign/"];

/** Token grants, refreshes among them. */
export const SUPABASE_TOKEN_PATH = "/auth/v1/token";

export function isTokenRateLimit(url: URL, response: { status: number }): boolean {
  return response.status === 429 && url.pathname === SUPABASE_TOKEN_PATH;
}

/** The same answer under a status auth-js retries instead of signing out (its retryable set is 5xx). */
export function asRetryable(response: Response): Response {
  return new Response(response.body, { status: 503, statusText: "Service Unavailable", headers: response.headers });
}

/**
 * fetch rejects with a TypeError when no response came back at all (DNS, a
 * reset, a blocked host). An abort is the caller's own deadline, and an HTTP
 * error is a response: neither is retried.
 */
function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError;
}

function isStream(body: BodyInit | null | undefined): boolean {
  return typeof ReadableStream !== "undefined" && body instanceof ReadableStream;
}

function requestUrl(input: RequestInfo | URL, base: string): URL | null {
  if (typeof input === "string") return new URL(input, base);
  if (input instanceof URL) return input;
  // A Request's body can be read only once: not worth a second attempt.
  return null;
}

export function createSupabaseFetch(opts: SupabaseFetchOptions): SupabaseFetchOptions["fetch"] {
  // Once the proxy had to step in, it goes first until the direct route works again.
  let preferProxy = false;
  return async (input, init) => {
    const loc = opts.location();
    const url = loc ? requestUrl(input, loc.href) : null;
    if (
      !loc ||
      !url ||
      url.origin !== opts.supabaseOrigin ||
      !PROXIED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
      isStream(init?.body)
    ) {
      return opts.fetch(input, init);
    }
    const direct = url.href;
    const proxied = `${loc.origin}${SUPABASE_PROXY_PATH}${url.pathname}${url.search}`;
    const attempt = (target: string) =>
      opts.fetch(target, target === proxied ? { ...init, credentials: "omit" } : init);
    const [first, second] = preferProxy ? [proxied, direct] : [direct, proxied];
    let response: Response;
    try {
      response = await attempt(first);
    } catch (err) {
      if (!isNetworkFailure(err)) throw err;
      response = await attempt(second);
      const viaProxy = second === proxied;
      if (viaProxy !== preferProxy) {
        preferProxy = viaProxy;
        // The service only (`auth/v1`, `storage/v1`): a storage path can carry a file name.
        if (viaProxy) opts.onProxy?.(url.pathname.split("/").slice(1, 3).join("/"));
      }
    }
    if (isTokenRateLimit(url, response)) {
      opts.onRateLimited?.();
      return asRetryable(response);
    }
    return response;
  };
}
