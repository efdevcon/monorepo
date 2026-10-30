import { NextRequest, NextResponse } from "next/server";
import { cookieClient } from "../cookieClient";
import { authCookieName, jwtExpiresAt } from "@/data/auth/authCookie";

/**
 * Mirrors the browser's Supabase session into the HTTP-only auth cookies
 * (`@supabase/ssr` shape, the same ones /api/auth/bridge writes).
 *
 * Why: the app signs in client-side (email OTP, session in localStorage), but
 * the install sign-in bridge is decided server-side: PersonalizedManifestLink
 * reads the session from the cookie when rendering the root layout's
 * <link rel="manifest">, and Safari hands the installed app that manifest's
 * start_url. Without this mirror a Safari OTP sign-in never reached the
 * server, so "Add to Home Screen" installed a signed-out app; only the
 * bridge link path (email, or the hop from another browser) worked.
 *
 * POST { access_token, refresh_token }: validates the pair by loading it into
 * a server client and writes the cookies. An access token that has already
 * expired is refused up front: setSession() would refresh it, and a refresh
 * from here rotates the browser's token family behind its back (see
 * src/data/auth/authCookie.ts); the browser refreshes on its own and mirrors
 * again. DELETE: clears the cookies (sign-out), so a shared device can't
 * install the previous user's app, by expiring them directly rather than
 * through the library, whose signOut() reads (and would refresh) the session
 * first. Neither method ever refreshes a token.
 */
export async function POST(request: NextRequest) {
  const { client, apply } = cookieClient(request);
  if (!client) {
    return NextResponse.json({ success: false, error: "Auth not configured" }, { status: 500 });
  }
  let body: { access_token?: unknown; refresh_token?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // Handled by the shape check below.
  }
  const { access_token, refresh_token } = body;
  if (typeof access_token !== "string" || typeof refresh_token !== "string" || !access_token || !refresh_token) {
    return NextResponse.json({ success: false, error: "Missing tokens" }, { status: 400 });
  }
  const expiresAt = jwtExpiresAt(access_token);
  if (expiresAt === null || expiresAt * 1000 <= Date.now()) {
    return NextResponse.json({ success: false, error: "Expired or malformed access token" }, { status: 401 });
  }
  const { data, error } = await client.auth.setSession({ access_token, refresh_token });
  if (error || !data.session) {
    return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
  }
  return apply(NextResponse.json({ success: true }));
}

export async function DELETE(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ success: false, error: "Auth not configured" }, { status: 500 });
  }
  // Only this cookie jar. The browser's own session (and other devices) are
  // not revoked here; the client SDK handles its own sign-out. Every chunk
  // of the auth cookie goes, plus the unchunked name in case none is present.
  const key = authCookieName(supabaseUrl);
  const chunk = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\.\\d+)?$`);
  const names = new Set([key, ...request.cookies.getAll().map((c) => c.name).filter((n) => chunk.test(n))]);
  const response = NextResponse.json({ success: true });
  for (const name of names) response.cookies.set(name, "", { path: "/", maxAge: 0 });
  return response;
}
