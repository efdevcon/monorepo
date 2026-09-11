import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "./auth";
import { ticketsPayload } from "./payload";
import { getStoreFromEnv } from "./pretix";

/**
 * The signed-in user's tickets: positions the account attached by QR proof
 * (first, flagged) plus paid tickets matched by the session email.
 */
export async function GET(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { success: false, error: "Auth not configured" },
        { status: 500 }
      );
    }

    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const store = getStoreFromEnv();
    if (!store) {
      // Not configured yet — return an empty (but successful) result so the UI
      // can render its empty state instead of erroring.
      return NextResponse.json({ success: true, data: { tickets: [] } });
    }

    return NextResponse.json({ success: true, data: await ticketsPayload(user, store) });
  } catch (err) {
    console.error("[/api/tickets] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
