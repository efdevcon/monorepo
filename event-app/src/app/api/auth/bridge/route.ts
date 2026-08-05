import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getRequestOrigin } from "../../_lib/origin";
import { verifyBridgeToken } from "@/data/auth/bridgeToken";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * The start_url of the personalized manifest minted server-side (see
 * src/app/layout.tsx's manifest link) — i.e. what actually runs when the
 * installed home-screen icon is first opened, or what the original
 * reminder email's link points at.
 *
 * Verifies the bridge token, generates a REAL Supabase magic link right
 * now (not earlier, so however long the gap since minting, it's fresh),
 * then — critically — verifies it SERVER-SIDE via token_hash and writes the
 * resulting session into an HTTP-only cookie directly, instead of
 * redirecting to Supabase's own /auth/v1/verify (which delivers the
 * session as a URL hash fragment the server never sees). admin.generateLink
 * never supports PKCE, so this is the documented workaround: use
 * `hashed_token` instead of `action_link`, and call verifyOtp ourselves.
 *
 * The cookie alone isn't enough, though: the REST of the app (useUser(),
 * Ticket.tsx, everything client-side) reads its session from localStorage
 * via the plain client-side Supabase SDK, which knows nothing about this
 * cookie — confirmed by testing, it stayed signed-out despite the cookie
 * being set correctly. So the redirect ALSO carries the same session as a
 * URL hash fragment in Supabase's own expected shape, which the client
 * SDK's existing (unchanged) detectSessionInUrl already auto-picks-up on
 * load — same end result client-side as the original hash-based flow, now
 * with the cookie as a bonus for the SSR/manifest-link use case.
 */
export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const bridgeToken = request.nextUrl.searchParams.get("bridge") || "";
  const verified = verifyBridgeToken(bridgeToken);
  const fallback = NextResponse.redirect(origin);

  if (!verified || !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return fallback;
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: verified.email,
    options: { redirectTo: `${origin}/ticket` },
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    return fallback;
  }

  // Collect cookies here first — we don't know the final redirect URL (it
  // needs the session, which verifyOtp hasn't returned yet) until after
  // this client's setAll fires, so there's no response object to attach
  // them to until below.
  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  const session = verifyData?.session;
  if (verifyError || !session) {
    return fallback;
  }

  const hash = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: String(session.expires_in),
    token_type: session.token_type,
    type: "magiclink",
  }).toString();

  const response = NextResponse.redirect(`${origin}/ticket#${hash}`);
  pendingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
  return response;
}
