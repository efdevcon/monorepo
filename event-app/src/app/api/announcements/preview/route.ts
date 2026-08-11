import { NextResponse } from "next/server";
import { getAnnouncements, syncAnnouncements } from "../service";

/**
 * Uncached preview for editors: syncs Notion into Supabase (so the preview
 * reflects unpublished edits) but does NOT purge the public feed's CDN cache
 * — other users keep seeing the published state for up to an hour. Also
 * includes future-dated rows so a scheduled announcement can be checked
 * before its send time. The app requests this instead of the cached feed
 * when opened with ?preview.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await syncAnnouncements();
    const announcements = await getAnnouncements({ includeFuture: true });
    return NextResponse.json(
      { success: true, data: { announcements } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[/api/announcements/preview] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load preview" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
