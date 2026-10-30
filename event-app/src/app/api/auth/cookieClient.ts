import type { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client over the request's auth cookies (`@supabase/ssr` shape),
 * for the Route Handlers that WRITE them: /api/auth/session (mirror a
 * browser session, sign out) and /api/auth/bridge. Cookie writes are
 * collected and attached to the response by `apply`, so call it on every
 * response once the client has been used. Not for reading who is signed in:
 * reading through this client refreshes an expired session and can sign the
 * person out of the app; readers use `cookieUser` (src/data/auth/cookieUser.ts).
 * `client` is null when Supabase isn't configured.
 */
export function cookieClient(request: NextRequest) {
  const pending: { name: string; value: string; options: CookieOptions }[] = [];
  const client =
    supabaseUrl && supabaseAnonKey
      ? createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              pending.push(...cookiesToSet);
            },
          },
        })
      : null;
  const apply = <R extends NextResponse>(response: R): R => {
    pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
  };
  return { client, apply };
}
