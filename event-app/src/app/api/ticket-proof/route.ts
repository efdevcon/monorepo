import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPaidTicketsByEmail, getStoreFromEnv } from "../tickets/pretix";
import { getRequestOrigin } from "../_lib/origin";
import {
  classifyTier,
  getPartner,
  proofToSearchParams,
  signTicketProof,
} from "./proof";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Mint a partner ticket proof for one of the signed-in user's tickets.
 *
 * Same two-check gate as the Meerkat handover (`/api/meerkat`) — valid Supabase
 * session, plus real ticket ownership confirmed against Pretix — with a third
 * check on top: the requested ticket must be one of *this* user's, because the
 * caller names which ticket it wants a proof for.
 *
 * Minting is on demand, one ticket at a time. An earlier prototype signed a
 * proof for every ticket and every add-on inside the tickets listing, which
 * meant N signatures per page view and left long-lived bearer proofs sitting in
 * client state for tickets nobody was proving.
 *
 * Swag and add-ons are unprovable by construction: we only ever match against
 * event-ticket secrets, never `addons[].secret`.
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Auth not configured" },
        { status: 500 }
      );
    }

    let body: { ticketSecret?: unknown; partner?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const ticketSecret =
      typeof body.ticketSecret === "string" ? body.ticketSecret : "";
    const partnerName =
      typeof body.partner === "string" ? body.partner.trim().toLowerCase() : "";

    if (!ticketSecret || !partnerName) {
      return NextResponse.json(
        { success: false, error: "ticketSecret and partner are required" },
        { status: 400 }
      );
    }

    const partner = getPartner(partnerName);
    if (!partner) {
      return NextResponse.json(
        { success: false, error: `Unknown partner "${partnerName}"` },
        { status: 400 }
      );
    }

    // 1. Verify the session and derive the email server-side — never trust a
    //    client-supplied identity.
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

    // 2. Fail closed if ticketing isn't configured. Unlike `/api/tickets`,
    //    which returns an empty list so the UI can render an empty state,
    //    handing out unverifiable proofs is worse than erroring.
    const store = getStoreFromEnv();
    if (!store) {
      console.error(
        "[/api/ticket-proof] Pretix not configured — refusing to issue a proof"
      );
      return NextResponse.json(
        { success: false, error: "Ticketing not configured" },
        { status: 503 }
      );
    }

    // 3. Confirm the requested ticket is one of this user's event tickets.
    const orders = await getPaidTicketsByEmail(user.email, store);
    const match = orders
      .flatMap((order) => order.tickets)
      .find((ticket) => ticket.secret === ticketSecret);

    if (!match) {
      return NextResponse.json(
        { success: false, error: "No matching ticket for this account" },
        { status: 403 }
      );
    }

    const tier = classifyTier(match);
    const proof = await signTicketProof({
      ticketSecret: match.secret,
      tier,
      partner: partnerName,
      event: store.eventSlug,
    });

    // Absolute URL so the link survives being copied out of the app and pasted
    // into another browser, which is the whole point of the hand-off.
    const base = partner.claimUrl.startsWith("http")
      ? partner.claimUrl
      : `${getRequestOrigin(request)}${partner.claimUrl}`;
    const claimUrl = `${base}?${proofToSearchParams(proof)}`;

    return NextResponse.json({
      success: true,
      data: {
        partner: partnerName,
        partnerLabel: partner.label,
        tier: proof.tier,
        exp: proof.exp,
        claimUrl,
      },
    });
  } catch (err) {
    console.error("[/api/ticket-proof] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to issue ticket proof" },
      { status: 500 }
    );
  }
}
