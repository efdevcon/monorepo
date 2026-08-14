import { NextRequest, NextResponse } from "next/server";
import { purgeCache } from "@netlify/functions";
import { dispatchDueAnnouncements } from "../service";
import { CACHE_TAG } from "../../announcements/service";

/**
 * The push sender, invoked every minute by the scheduled Netlify function
 * (netlify/functions/push-dispatch.mts) and gated by PUSH_DISPATCH_SECRET.
 * Claims due announcements atomically and fans out — see service.ts for the
 * crash-safety design. Safe to call concurrently or manually (idempotent:
 * a second caller claims nothing).
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

  try {
    const result = await dispatchDueAnnouncements();

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
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[/api/push/dispatch] error:", err);
    return NextResponse.json(
      { success: false, error: "Dispatch failed" },
      { status: 500 }
    );
  }
}
