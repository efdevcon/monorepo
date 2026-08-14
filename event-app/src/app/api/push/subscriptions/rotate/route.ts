import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../service";

/**
 * Handle `pushsubscriptionchange`: the browser rotated the push endpoint and
 * the service worker re-subscribed. The SW has no Supabase session, so this
 * endpoint is deliberately unauthenticated — knowledge of the OLD endpoint
 * (an unguessable push-service URL) is the proof of ownership. The new row
 * inherits the old row's user attribution; unknown old endpoints are
 * rejected, so this can't be used to create subscriptions from thin air.
 *
 * Without this, rotated endpoints go permanently dark (unfixed at Devcon SEA).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const oldEndpoint: unknown = body?.oldEndpoint;
    const sub = body?.subscription;
    const endpoint: unknown = sub?.endpoint;
    const p256dh: unknown = sub?.keys?.p256dh;
    const auth: unknown = sub?.keys?.auth;
    if (
      typeof oldEndpoint !== "string" ||
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://") ||
      typeof p256dh !== "string" ||
      typeof auth !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid rotation payload" },
        { status: 400 }
      );
    }

    const db = getSupabase();
    const { data: existing, error: readError } = await db
      .from("devcon8_push_subscriptions")
      .select("user_id, is_team")
      .eq("endpoint", oldEndpoint)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Unknown subscription" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const { error: upsertError } = await db
      .from("devcon8_push_subscriptions")
      .upsert(
        {
          endpoint,
          p256dh,
          auth,
          user_id: existing.user_id,
          is_team: existing.is_team,
          updated_at: now,
        },
        { onConflict: "endpoint" }
      );
    if (upsertError) throw new Error(upsertError.message);

    if (oldEndpoint !== endpoint) {
      await db
        .from("devcon8_push_subscriptions")
        .delete()
        .eq("endpoint", oldEndpoint);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/push/subscriptions/rotate] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to rotate subscription" },
      { status: 500 }
    );
  }
}
