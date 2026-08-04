import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import APP_CONFIG from "@/CONFIG";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Mints a personalized manifest for the currently signed-in user: same as
 * the static manifest, but `start_url` carries a fresh Supabase magic link
 * (via a same-origin redirector, see /api/auth/bridge — a manifest's
 * start_url must stay in-scope). The client swaps the page's manifest
 * <link> to point at this response (as a blob: URL) so that if the user
 * then does "Add to Home Screen", launching the installed icon signs them
 * back in automatically — without this, iOS isolates the installed app's
 * storage from the browser tab it was installed from, so a session
 * established by clicking an email link is otherwise lost on first launch.
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Auth not configured" },
        { status: 500 }
      );
    }
    if (!supabaseServiceRoleKey) {
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const origin = new URL(request.url).origin;
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: user.email,
      options: { redirectTo: `${origin}/ticket` },
    });
    if (error || !data?.properties?.action_link) {
      return NextResponse.json(
        { success: false, error: "Failed to generate link" },
        { status: 500 }
      );
    }

    const bridgeUrl = `${origin}/api/auth/bridge?redirect=${encodeURIComponent(
      data.properties.action_link
    )}`;

    // Same shape as src/app/manifest.ts, with start_url swapped.
    const manifest = {
      name: APP_CONFIG.APP_NAME,
      short_name: APP_CONFIG.APP_NAME,
      description: APP_CONFIG.APP_DESCRIPTION,
      start_url: bridgeUrl,
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
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[/api/manifest-bridge] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to build install bridge" },
      { status: 500 }
    );
  }
}
