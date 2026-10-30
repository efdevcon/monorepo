import { cookieUser, type CookieUser } from "./cookieUser";

/**
 * Who is signed in, for Server Components (the personalised manifest link on
 * first paint). Reads the request's cookies through next/headers and
 * validates the access token found there, never refreshing it: Server
 * Components cannot write cookies anyway, and a refresh would rotate the
 * browser's tokens behind its back (authCookie.ts). The client-side app keeps
 * using its own session (src/data/auth/supabase.ts) for everything else.
 */
export async function cookieUserFromHeaders(): Promise<CookieUser> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return cookieUser(cookieStore.getAll());
}
