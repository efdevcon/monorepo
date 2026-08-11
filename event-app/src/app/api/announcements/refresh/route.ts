import { NextRequest, NextResponse } from "next/server";
import { purgeCache } from "@netlify/functions";
import { CACHE_TAG, getAnnouncements, syncAnnouncements } from "../service";

/**
 * The editors' "Publish" endpoint: syncs the Notion DB into Supabase, purges
 * the CDN tag on the cached feed (pushing edits live for everyone), and
 * confirms. Linked from the Notion DB description as a one-click action —
 * browser requests get an HTML confirmation, JSON otherwise.
 *
 * A dedicated PATH (not a ?refresh query param) on purpose: Netlify's Next
 * runtime excludes unknown query params from its cache key, so a param
 * variant would be served from the same cached object as the plain route
 * (learned on the ens-page links API, devcon/src/pages/api/links/refresh.ts).
 */
export const dynamic = "force-dynamic";

const REFRESHED_HTML = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Announcements published</title>
<body style="font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 90vh; margin: 0">
  <div style="text-align: center">
    <div style="font-size: 3rem">&#9989;</div>
    <h1 style="font-size: 1.25rem">Announcements published</h1>
    <p style="color: #666">Your Notion edits are now live in the app.</p>
  </div>
</body>`;

export async function GET(request: NextRequest) {
  try {
    const synced = await syncAnnouncements();

    // Purge the CDN-cached copy of /api/announcements so everyone gets fresh
    // data. Best-effort: local dev has no purge token, and stale-for-up-to-1h
    // is not an error.
    try {
      await purgeCache({ tags: [CACHE_TAG] });
    } catch (err) {
      console.warn(
        "[/api/announcements/refresh] cache purge skipped:",
        (err as Error).message
      );
    }

    if (request.headers.get("accept")?.includes("text/html")) {
      return new NextResponse(REFRESHED_HTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const announcements = await getAnnouncements();
    return NextResponse.json(
      { success: true, data: { synced, announcements } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[/api/announcements/refresh] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to refresh announcements" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
