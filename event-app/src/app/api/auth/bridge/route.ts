import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin redirector used as the `start_url` of the personalized
 * manifest minted by /api/manifest-bridge. A manifest's start_url must be
 * in-scope (same-origin) to keep the app installable — this route is that
 * in-scope anchor, and its only job is to forward on to the real (external,
 * cross-origin) Supabase magic-link verification URL.
 *
 * Only forwards to the configured Supabase project's own /auth/v1/verify
 * endpoint — never an arbitrary URL — so this can't be used as an open
 * redirect.
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const redirectParam = request.nextUrl.searchParams.get("redirect");

  if (!supabaseUrl || !redirectParam) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  let target: URL;
  try {
    target = new URL(redirectParam);
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const allowedHost = new URL(supabaseUrl).host;
  if (target.host !== allowedHost || target.pathname !== "/auth/v1/verify") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(target);
}
