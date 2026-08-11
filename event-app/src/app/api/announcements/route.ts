import { NextResponse } from "next/server";
import {
  CACHE_TAG,
  getAnnouncements,
  syncAnnouncements,
  type Announcement,
} from "./service";

/**
 * The announcements feed. Serves Supabase (synced from Notion); the Netlify
 * CDN caches this response for an hour (s-maxage + Netlify-Cache-Tag), so
 * origin sees roughly one hit per hour. Editors' "Publish" link
 * (/api/announcements/refresh) purges the tag for an instant push.
 *
 * Each origin hit re-syncs from Notion best-effort first, which is what makes
 * plain Notion edits go live "within ~1h" without anyone clicking Publish —
 * and a Notion outage degrades to the last-synced data instead of an error.
 *
 * Future-dated rows are excluded here (scheduled reveals) and clients
 * time-gate again locally, so a stale CDN copy can never show an
 * announcement early.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    try {
      await syncAnnouncements();
    } catch (err) {
      console.warn(
        "[/api/announcements] sync skipped, serving last-synced data:",
        (err as Error).message
      );
    }
    const announcements: Announcement[] = await getAnnouncements();
    return NextResponse.json(
      { success: true, data: { announcements } },
      {
        headers: {
          "Netlify-Cache-Tag": CACHE_TAG,
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[/api/announcements] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load announcements" },
      // Never cache failures.
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
