import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { parseAuthCookie } from "./authCookie";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Session-less client: `getUser(jwt)` only asks the auth server whether a token is valid. */
let validator: SupabaseClient | null = null;
function getValidator(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!validator) {
    validator = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return validator;
}

export interface CookieUser {
  /** False when Supabase isn't configured on this deployment. */
  configured: boolean;
  /** Whether the request carried an auth cookie at all (a missing mirror vs an expired one). */
  hadCookie: boolean;
  user: User | null;
  /** The auth server's reason when a cookie was present but refused (expired, revoked…). */
  reason: string | null;
}

/**
 * Who is signed in according to the request's cookies, validated and never
 * refreshed (see authCookie.ts for why a refresh here would sign people
 * out). For Route Handlers pass `request.cookies.getAll()`, for Server
 * Components the `cookies()` store's `getAll()`. One round trip to the auth
 * server per call; the result is authentic, so it can gate actions.
 */
export async function cookieUser(
  cookies: readonly { name: string; value: string }[]
): Promise<CookieUser> {
  const client = getValidator();
  if (!client || !supabaseUrl) {
    return { configured: false, hadCookie: false, user: null, reason: "auth not configured" };
  }
  const session = parseAuthCookie(cookies, supabaseUrl);
  if (!session) return { configured: true, hadCookie: false, user: null, reason: null };
  const { data, error } = await client.auth.getUser(session.access_token);
  return {
    configured: true,
    hadCookie: true,
    user: data.user ?? null,
    reason: error?.message ?? null,
  };
}
