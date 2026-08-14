import { NextRequest, NextResponse } from "next/server";
import { requireEthereumOrg } from "@/data/admin/adminApiAuth";
import { buildPayload, fanOut, getSubscriptions, getSupabase } from "../service";

/**
 * Team-only test send: pushes one announcement to @ethereum.org subscribers
 * only, WITHOUT touching its status — the real broadcast still happens at
 * Send At. Cheap insurance against typo broadcasts: check the notification
 * on your own phone before the world gets it.
 *
 * Usage (signed in as @ethereum.org):
 *   POST /api/push/test  { "id": "<announcement id>" }
 */
export async function POST(request: NextRequest) {
  const auth = await requireEthereumOrg(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const id: unknown = body?.id;
    if (typeof id !== "string" || !id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const { data: announcement, error } = await getSupabase()
      .from("devcon8_announcements")
      .select("id, title, message, url")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!announcement) {
      return NextResponse.json(
        { success: false, error: "Unknown announcement" },
        { status: 404 }
      );
    }

    const subs = await getSubscriptions({ teamOnly: true });
    if (subs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { ok: 0, fail: 0, note: "No team subscriptions yet" },
      });
    }

    // Same payload builder as the real dispatch, so a test send renders
    // exactly what attendees will get.
    const result = await fanOut(subs, buildPayload(announcement));
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[/api/push/test] error:", err);
    return NextResponse.json(
      { success: false, error: "Test send failed" },
      { status: 500 }
    );
  }
}
