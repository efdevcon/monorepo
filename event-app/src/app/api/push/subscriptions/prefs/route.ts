import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../service";
import { requireUser, type PushPrefs } from "../shared";

/**
 * Read the caller's notification preferences for one device:
 * `{ endpoint }` → `{ announcements, reminders }`. A POST, not a GET, so the
 * endpoint (a push-service capability URL) stays out of query strings and
 * access logs. Scoped to the signed-in account: another account's row, or
 * none, is a 404 (the client then treats the device as not subscribed here).
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
    if (typeof endpoint !== "string") {
      return NextResponse.json(
        { success: false, error: "endpoint is required" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from("devcon8_push_subscriptions")
      .select("announcements, reminders")
      .eq("endpoint", endpoint)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Unknown subscription" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: data as PushPrefs });
  } catch (err) {
    console.error("[/api/push/subscriptions/prefs] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to read preferences" },
      { status: 500 }
    );
  }
}
