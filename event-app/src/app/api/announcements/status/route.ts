import { NextRequest, NextResponse } from "next/server";
import { requireEthereumOrg } from "@/data/admin/adminApiAuth";
import { getAnnouncementsStatus } from "../service";

/**
 * The feed's sync state for the EF internal tools on My Devcon: when the
 * Notion sync last wrote the table, a version to compare devices by, and
 * the announcements dated after now with their Visible / Push / test state.
 * Hidden and future rows are team-only information, hence the @ethereum.org
 * gate (same as /api/push/test). Reads only, never cached.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireEthereumOrg(request);
  if (!auth.ok) return auth.response;
  try {
    const data = await getAnnouncementsStatus();
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[/api/announcements/status] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to read the announcements status" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
