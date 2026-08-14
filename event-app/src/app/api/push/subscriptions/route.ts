import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabase } from "../service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Team accounts get test-sends before broadcasts go out. */
const TEAM_DOMAIN = "@ethereum.org";

async function requireUser(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const token = (request.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    ""
  );
  if (!token) return null;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  return error || !user ? null : user;
}

/**
 * Store (or refresh) the caller's push subscription. Sign-in required; the
 * row is keyed by endpoint with UPSERT semantics — re-subscribing the same
 * browser must never error (a Devcon SEA bug: `create` hit the unique
 * constraint and 500ed).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const endpoint: unknown = body?.endpoint;
    const p256dh: unknown = body?.keys?.p256dh;
    const auth: unknown = body?.keys?.auth;
    if (
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://") ||
      typeof p256dh !== "string" ||
      typeof auth !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid subscription" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { error } = await getSupabase()
      .from("devcon8_push_subscriptions")
      .upsert(
        {
          endpoint,
          p256dh,
          auth,
          user_id: user.id,
          is_team: !!user.email?.toLowerCase().endsWith(TEAM_DOMAIN),
          updated_at: now,
        },
        { onConflict: "endpoint" }
      );
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/push/subscriptions] POST error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to store subscription" },
      { status: 500 }
    );
  }
}

/** Remove the caller's subscription (explicit opt-out from the UI). */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const endpoint: unknown = body?.endpoint;
    if (typeof endpoint !== "string") {
      return NextResponse.json(
        { success: false, error: "endpoint is required" },
        { status: 400 }
      );
    }

    const { error } = await getSupabase()
      .from("devcon8_push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/push/subscriptions] DELETE error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
