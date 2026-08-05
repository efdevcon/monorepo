import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import APP_CONFIG from "@/CONFIG";
import { getRequestOrigin } from "../_lib/origin";
import { signBridgeToken, verifyBridgeToken } from "@/data/auth/bridgeToken";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * POST: mints a signed bridge token for the currently signed-in user (see
 * _lib/bridgeToken — no real Supabase credential yet, just proof of who
 * they are). The client points the page's manifest <link> at this route's
 * GET, passing that token — a real, independently-fetchable URL rather
 * than a blob:, since a blob: URL only resolves within the page's own JS
 * realm and may not be usable by iOS's own manifest-fetching machinery
 * when "Add to Home Screen" is invoked.
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Auth not configured" },
        { status: 500 }
      );
    }
    if (!process.env.INSTALL_BRIDGE_SECRET) {
      // Feature quietly unavailable until provisioned — same pattern as
      // getStoreFromEnv() elsewhere in this app.
      return NextResponse.json(
        { success: false, error: "Install bridge not configured" },
        { status: 503 }
      );
    }

    const token = (request.headers.get("authorization") || "").replace(
      /^Bearer\s+/i,
      ""
    );
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing auth token" },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user?.email) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const bridgeToken = signBridgeToken(user.email);
    return NextResponse.json({ bridgeToken });
  } catch (err) {
    console.error("[/api/manifest-bridge POST] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create install bridge" },
      { status: 500 }
    );
  }
}

/**
 * GET: returns a manifest (same shape as src/app/manifest.ts) whose
 * start_url carries the bridge token through to /api/auth/bridge. A real,
 * independently-fetchable URL — not something only the page's own JS can
 * resolve — so it works regardless of how/when iOS decides to read it.
 */
export async function GET(request: NextRequest) {
  const bridgeToken = request.nextUrl.searchParams.get("bridge") || "";
  if (!verifyBridgeToken(bridgeToken)) {
    return NextResponse.json(
      { success: false, error: "Invalid or expired bridge token" },
      { status: 400 }
    );
  }

  const origin = getRequestOrigin(request);
  const manifest = {
    name: APP_CONFIG.APP_NAME,
    short_name: APP_CONFIG.APP_NAME,
    description: APP_CONFIG.APP_DESCRIPTION,
    start_url: `${origin}/api/auth/bridge?bridge=${encodeURIComponent(bridgeToken)}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "private, no-store",
    },
  });
}
