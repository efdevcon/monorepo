import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "../../tickets/auth";
import { createRateLimiter } from "../../tickets/rateLimit";
import { serviceClient } from "../../serviceClient";
import { parseSyncBody, type SyncResponse } from "@/data/interested/syncProtocol";

/**
 * Interests sync. The device posts its pending star changes and the cursor
 * from its last sync; the `devcon8_interests_sync` function merges them
 * last-write-wins per item and returns the account's changes since that
 * cursor plus the new cursor. The user id comes from the verified session,
 * never from the body.
 */
const perUser = createRateLimiter(120, 10 * 60_000);

const fail = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) return fail("Invalid or expired session", 401);
    const db = serviceClient();
    if (!db) return fail("Interests sync is not available right now", 503);
    if (!perUser.allow(user.id)) return fail("Too many requests, try again in a few minutes", 429);

    const body = parseSyncBody(await request.json().catch(() => null));
    if (!body) return fail("Invalid sync request", 400);

    const { data, error } = await db.rpc("devcon8_interests_sync", {
      p_user_id: user.id,
      p_event: body.event,
      p_since: body.since === null ? null : new Date(body.since).toISOString(),
      p_changes: body.changes.map((change) => ({
        kind: change.kind,
        item_id: change.id,
        interested: change.interested,
        updated_at: change.updatedAt,
      })),
    });
    if (error) throw new Error(error.message);

    const result = data as { changes?: SyncResponse["changes"]; now?: number } | null;
    const payload: SyncResponse = {
      changes: Array.isArray(result?.changes) ? result.changes : [],
      now: typeof result?.now === "number" ? result.now : Date.now(),
    };
    return NextResponse.json({ success: true, data: payload });
  } catch (err) {
    console.error("[/api/interests/sync] error:", err);
    return fail("Couldn't sync interests", 500);
  }
}
