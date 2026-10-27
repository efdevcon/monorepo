import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { trackEvent } from "@/data/analytics/track";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Same-origin path the host forwards to the Supabase project (the proxy rule
 * in netlify.toml; keep the two in step). A fallback, not the default route:
 * the browser talks to supabase.co directly and comes here only after that
 * failed on the network. Some ISPs (a cluster of Indian ones in the sign-in
 * failures of October 2026) cannot reach that host while the app's own origin
 * answers, and a code that never arrives is the whole sign-in. Staying direct
 * otherwise keeps Supabase's per-address rate limits on each device's own
 * address rather than the proxy's, and keeps the proxy's traffic to those who
 * need it.
 */
export const SUPABASE_PROXY_PATH = "/supabase";

/**
 * The paths the proxy rule forwards (keep in step with netlify.toml): auth,
 * and the signed uploads of the feedback form. Any other Supabase request
 * fails as it did before.
 */
const PROXIED_PREFIXES = ["/auth/v1/", "/storage/v1/object/upload/sign/"];

/** Once the proxy had to step in, it goes first until the direct route works again. */
let preferProxy = false;

function originOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

const supabaseOrigin = originOf(supabaseUrl);

function requestUrl(input: RequestInfo | URL): URL | null {
  if (typeof input === "string") return new URL(input, window.location.href);
  if (input instanceof URL) return input;
  // A Request's body can be read only once: not worth a second attempt.
  return null;
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

/**
 * `fetch` for the Supabase client: the direct URL first and the proxied one
 * when that fails on the network (the other way round once the proxy was
 * needed), with the same method, headers and body. The client sends strings,
 * blobs and form data, which a second attempt can send again. The proxied
 * request is same-origin, so it is sent without credentials: the app's own
 * cookies (the auth mirror among them) have no business at Supabase.
 */
async function fetchWithProxyFallback(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof window === "undefined" ? null : requestUrl(input);
  if (
    !url ||
    url.origin !== supabaseOrigin ||
    !PROXIED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
    isStream(init?.body)
  ) {
    return fetch(input, init);
  }
  const direct = url.href;
  const proxied = `${window.location.origin}${SUPABASE_PROXY_PATH}${url.pathname}${url.search}`;
  const attempt = (target: string) =>
    fetch(target, target === proxied ? { ...init, credentials: "omit" } : init);
  const [first, second] = preferProxy ? [proxied, direct] : [direct, proxied];
  try {
    return await attempt(first);
  } catch (err) {
    if (!isNetworkFailure(err)) throw err;
    const response = await attempt(second);
    const viaProxy = second === proxied;
    if (viaProxy !== preferProxy) {
      preferProxy = viaProxy;
      // The service only (`auth/v1`, `storage/v1`): a storage path can carry a file name.
      if (viaProxy) trackEvent("network", "supabase-proxy", url.pathname.split("/").slice(1, 3).join("/"));
    }
    return response;
  }
}

/**
 * Shared Supabase client used for email-OTP authentication and the feedback
 * uploads. Null if the env vars are not configured (auth UI then stays
 * disabled).
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: fetchWithProxyFallback } })
    : null;
