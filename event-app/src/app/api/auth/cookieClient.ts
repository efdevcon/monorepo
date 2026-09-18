import type { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client over the request's HTTP-only auth cookies (`@supabase/ssr`
 * shape, written by /api/auth/session and /api/auth/bridge), for Route
 * Handlers that need to know who is signed in without a Bearer token: a
 * top-level navigation such as the Meerkat hand-off carries only cookies.
 * Cookie writes (a token refresh, sign-out) are collected and attached to
 * the response by `apply`, so call it on every response once the client has
 * been used. `client` is null when Supabase isn't configured.
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
