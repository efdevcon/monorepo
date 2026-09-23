import { NextRequest, NextResponse } from "next/server";
import { purgeCache } from "@netlify/functions";
import { dispatchDueAnnouncements } from "../service";
import { dispatchDueSessionReminders } from "../reminders";
import { CACHE_TAG } from "../../announcements/service";

/**
 * The push sender, invoked every minute by the scheduled Netlify function
 * (netlify/functions/push-dispatch.mts) and gated by PUSH_DISPATCH_SECRET.
 * Claims due announcements atomically and fans out — see service.ts for the
 * crash-safety design — and, independently, the session reminders for
 * starred sessions entering their 10-minute window (reminders.ts). Safe to
 * call concurrently or manually (idempotent: a second caller claims nothing).
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  const provided = (request.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    ""
  );
  // Fail closed when unconfigured — never an open dispatch endpoint.
  if (!secret || provided !== secret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Two independent senders: a failing bundle fetch must never hold back an
  // announcement, and vice versa. Both run at once (they share no rows).
  const [announcements, reminders] = await Promise.allSettled([
    dispatchDueAnnouncements(),
    dispatchDueSessionReminders(),
  ]);

  if (announcements.status === "fulfilled") {
    const result = announcements.value;
    // A send means the announcement just went live — purge the feed's CDN tag
    // so the inbox shows it as fast as the push arrives. Best-effort.
    if (result.sent.length > 0) {
      try {
        await purgeCache({ tags: [CACHE_TAG] });
      } catch (err) {
        console.warn(
          "[/api/push/dispatch] cache purge skipped:",
          (err as Error).message
        );
      }
    }
    if (result.claimed > 0) {
      console.log(
        `[/api/push/dispatch] claimed=${result.claimed} subscribers=${result.subscribers}`,
        result.sent
      );
    }
  } else {
    console.error("[/api/push/dispatch] announcements error:", announcements.reason);
  }

  if (reminders.status === "fulfilled") {
    for (const r of reminders.value) {
      if (r.claimed > 0 || r.skipped > 0) {
        console.log(
          `[/api/push/dispatch] reminders ${r.event}: due=${r.due} claimed=${r.claimed} sent=${r.sent} ok=${r.ok} fail=${r.fail} skipped=${r.skipped}`
        );
      }
    }
  } else {
    console.error("[/api/push/dispatch] reminders error:", reminders.reason);
  }

  if (announcements.status === "rejected" && reminders.status === "rejected") {
    return NextResponse.json(
      { success: false, error: "Dispatch failed" },
      { status: 500 }
    );
  }
  return NextResponse.json({
    success: true,
    data: {
      announcements:
        announcements.status === "fulfilled" ? announcements.value : null,
      reminders: reminders.status === "fulfilled" ? reminders.value : null,
    },
  });
}
