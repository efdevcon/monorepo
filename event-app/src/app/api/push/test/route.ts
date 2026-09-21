import { NextRequest, NextResponse } from "next/server";
import { requireEthereumOrg } from "@/data/admin/adminApiAuth";
import { buildPayload, fanOut, getSubscriptions, getSupabase } from "../service";
import {
  buildReminderPayload,
  fetchReminderCatalogue,
  reminderDatasets,
} from "../reminders";

/**
 * Team-only test send: pushes one announcement, or one session reminder, to
 * @ethereum.org subscribers only, WITHOUT touching any send state — the real
 * broadcast still happens at Send At / 15 minutes before the session. Cheap
 * insurance against typo broadcasts: check the notification on your own
 * phone before the world gets it.
 *
 * Usage (signed in as @ethereum.org):
 *   POST /api/push/test  { "id": "<announcement id>" }
 *   POST /api/push/test  { "sessionId": "<session id>", "event": "devcon8"? }
 * `event` is a dataset key; it defaults to the first configured reminder
 * event (PUSH_REMINDER_EVENTS or the deployment default).
 */
export async function POST(request: NextRequest) {
  const auth = await requireEthereumOrg(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const id: unknown = body?.id;
    const sessionId: unknown = body?.sessionId;
    if (
      (typeof id !== "string" || !id) &&
      (typeof sessionId !== "string" || !sessionId)
    ) {
      return NextResponse.json(
        { success: false, error: "id or sessionId is required" },
        { status: 400 }
      );
    }

    let payload: string;
    if (typeof sessionId === "string" && sessionId) {
      const datasets = reminderDatasets();
      const ds =
        typeof body?.event === "string"
          ? datasets.find((d) => d.key === body.event)
          : datasets[0];
      if (!ds) {
        return NextResponse.json(
          { success: false, error: "Unknown event" },
          { status: 400 }
        );
      }
      const session = (await fetchReminderCatalogue(ds)).find(
        (s) => s.id === sessionId
      );
      if (!session) {
        return NextResponse.json(
          { success: false, error: "Unknown session" },
          { status: 404 }
        );
      }
      // As the real reminder would read 15 minutes before the start.
      payload = buildReminderPayload(session, ds.timezone);
    } else {
      const { data: announcement, error } = await getSupabase()
        .from("devcon8_announcements")
        .select("id, title, message, url")
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!announcement) {
        return NextResponse.json(
          { success: false, error: "Unknown announcement" },
          { status: 404 }
        );
      }
      payload = buildPayload(announcement);
    }

    const subs = await getSubscriptions({ teamOnly: true });
    if (subs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { ok: 0, fail: 0, note: "No team subscriptions yet" },
      });
    }

    // Same payload builders as the real dispatch, so a test send renders
    // exactly what attendees will get.
    const result = await fanOut(subs, payload);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[/api/push/test] error:", err);
    return NextResponse.json(
      { success: false, error: "Test send failed" },
      { status: 500 }
    );
  }
}
