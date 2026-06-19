import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPaidTicketsByEmail, getStoreFromEnv } from "./pretix";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Auth not configured" },
        { status: 500 }
      );
    }

    // Verify the Supabase access token and derive the email server-side.
    const token = (request.headers.get("authorization") || "").replace(
      /^Bearer\s+/i,
      ""
    );
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing auth token" },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user?.email) {
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

    const tickets = await getPaidTicketsByEmail(user.email, store);
    return NextResponse.json({ success: true, data: { tickets } });
  } catch (err) {
    console.error("[/api/tickets] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
