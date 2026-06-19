import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPaidTicketsByEmail, getStoreFromEnv } from "../tickets/pretix";
import { generateHandoverToken } from "./verification";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Issue a Meerkat handover JWT for the signed-in user.
 *
 * Gated on two checks so we never hand a token to someone who shouldn't have
 * one: (1) a valid Supabase session, and (2) ownership of at least one paid
 * Pretix ticket for the configured event. The email baked into the JWT is the
 * verified session email — never client-supplied.
 */
export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  // 1. Verify the Supabase access token and derive the email server-side.
  const token = (request.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    ""
  );
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Verify ticket ownership against Pretix. Fail closed if ticketing isn't
  // configured — better to block than to hand out tokens without a gate.
  const store = getStoreFromEnv();
  if (!store) {
    console.error("[/api/meerkat] Pretix not configured — refusing to issue token");
    return NextResponse.json(
      { error: "Ticketing not configured" },
      { status: 503 }
    );
  }

  let ownsTicket = false;
  try {
    const orders = await getPaidTicketsByEmail(user.email, store);
    ownsTicket = orders.some((order) => order.tickets.length > 0);
  } catch (err) {
    console.error("[/api/meerkat] ticket lookup failed:", err);
    return NextResponse.json(
      { error: "Failed to verify ticket" },
      { status: 502 }
    );
  }

  if (!ownsTicket) {
    return NextResponse.json(
      { error: "A valid ticket is required to ask questions" },
      { status: 403 }
    );
  }

  // 3. Issue the handover token with the verified email.
  const handoverToken = generateHandoverToken(user.email);
  return NextResponse.json({ token: handoverToken });
}
