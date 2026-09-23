import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../service";
import { parsePrefs, requireUser, type PushPrefs } from "./shared";

/** Team accounts get test-sends before broadcasts go out. */
const TEAM_DOMAIN = "@ethereum.org";

const PREF_COLUMNS = "announcements, reminders";

/**
 * Store (or refresh) the caller's push subscription. Sign-in required; the
 * row is keyed by endpoint with UPSERT semantics — re-subscribing the same
 * browser must never error (a Devcon SEA bug: `create` hit the unique
 * constraint and 500ed).
 *
 * Optional `prefs: { announcements?, reminders? }` sets only the flags given:
 * the upsert names only those columns, so re-subscribing never resets a flag
 * and a new row takes the column defaults (announcements on, reminders off)
 * for the rest. A result with both off is refused — the client unsubscribes
 * instead. Responds with the stored flags.
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
    const prefs = parsePrefs(body?.prefs);
    if (
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://") ||
      typeof p256dh !== "string" ||
      typeof auth !== "string" ||
      !prefs
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid subscription" },
        { status: 400 }
      );
    }

    const db = getSupabase();
    // Only a flag turned off can leave both off; read the row just then.
    if (prefs.announcements === false || prefs.reminders === false) {
      const { data: existing, error: readError } = await db
        .from("devcon8_push_subscriptions")
        .select(PREF_COLUMNS)
        .eq("endpoint", endpoint)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      const announcements = prefs.announcements ?? existing?.announcements ?? true;
      const reminders = prefs.reminders ?? existing?.reminders ?? false;
      if (!announcements && !reminders) {
        return NextResponse.json(
          { success: false, error: "At least one notification type must stay on" },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const { data, error } = await db
      .from("devcon8_push_subscriptions")
      .upsert(
        {
          endpoint,
          p256dh,
          auth,
          user_id: user.id,
          is_team: !!user.email?.toLowerCase().endsWith(TEAM_DOMAIN),
          updated_at: now,
          ...prefs,
        },
        { onConflict: "endpoint" }
      )
      .select(PREF_COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data: data as PushPrefs });
  } catch (err) {
    console.error("[/api/push/subscriptions] POST error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to store subscription" },
      { status: 500 }
    );
  }
}

/**
 * Change the caller's preferences for one of their devices:
 * `{ endpoint, prefs: { announcements?, reminders? } }`. The row must belong
 * to the signed-in account (404 otherwise). Both flags off is refused (400):
 * a row exists only while at least one is on, so the client unsubscribes
 * instead. Responds with the stored flags.
 */
export async function PATCH(request: NextRequest) {
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
    const prefs = parsePrefs(body?.prefs);
    if (typeof endpoint !== "string" || !prefs || Object.keys(prefs).length === 0) {
      return NextResponse.json(
        { success: false, error: "endpoint and prefs are required" },
        { status: 400 }
      );
    }

    const db = getSupabase();
    const { data: existing, error: readError } = await db
      .from("devcon8_push_subscriptions")
      .select(PREF_COLUMNS)
      .eq("endpoint", endpoint)
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Unknown subscription" },
        { status: 404 }
      );
    }
    const next: PushPrefs = {
      announcements: prefs.announcements ?? existing.announcements,
      reminders: prefs.reminders ?? existing.reminders,
    };
    if (!next.announcements && !next.reminders) {
      return NextResponse.json(
        { success: false, error: "At least one notification type must stay on" },
        { status: 400 }
      );
    }

    const { error } = await db
      .from("devcon8_push_subscriptions")
      .update({ ...next, updated_at: new Date().toISOString() })
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data: next });
  } catch (err) {
    console.error("[/api/push/subscriptions] PATCH error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update preferences" },
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
