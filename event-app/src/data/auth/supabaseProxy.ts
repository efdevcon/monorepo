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
 *
 * Used by the client's fetch (src/data/auth/supabaseFetch.ts).
 */
export const SUPABASE_PROXY_PATH = "/supabase";
