import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { trackEvent } from "@/data/analytics/track";
import { createSupabaseFetch } from "./supabaseFetch";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function originOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

/**
 * The client's `fetch` (src/data/auth/supabaseFetch.ts): the same-origin
 * proxy for browsers that cannot reach supabase.co, and rate-limited token
 * refreshes softened into failures auth-js retries rather than signs out on.
 * Both are reported, so Matomo shows how often a venue network needs them.
 */
const supabaseFetch = createSupabaseFetch({
  supabaseOrigin: originOf(supabaseUrl),
  location: () => (typeof window === "undefined" ? null : { origin: window.location.origin, href: window.location.href }),
  fetch: (input, init) => fetch(input, init),
  onProxy: (service) => trackEvent("network", "supabase-proxy", service),
  onRateLimited: () => trackEvent("network", "token-rate-limited"),
});

/**
 * Shared Supabase client used for email-OTP authentication and the feedback
 * uploads. Null if the env vars are not configured (auth UI then stays
 * disabled).
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: supabaseFetch } })
    : null;
