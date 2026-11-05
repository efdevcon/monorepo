import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SwagAdditionOffer } from "@/data/tickets/swagAdditions";
import { listLinks } from "../tickets/links";
import { mirrorPicture } from "../tickets/pictures";
import { getStoreFromEnv, getTicketsForUser, loadCatalog, loadCategories, type PretixStore } from "../tickets/pretix";
import { remainingUses, swagAdditionOffers, swagVoucherCode, swagVoucherPayload, ticketRef, voucherFixes } from "./additions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const fail = (status: number, error: string) => NextResponse.json({ success: false, error }, { status });

/**
 * Swag additions (data/tickets/swagAdditions.ts): POST { action: "status" | "buy", ticketSecret, itemId? }.
 *
 * Same gate as the partner proofs (valid session, the ticket is one of this
 * account's event tickets, read live from Pretix), plus check-in. "status"
 * returns each addition (read from the Pretix setup, additions.ts) with its
 * price and how many are left for this ticket; "buy"
 * gets (or creates) the ticket's one-time voucher for that product and
 * returns the Pretix page that redeems it, where checkout happens.
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) return fail(500, "Auth not configured");
    const store = getStoreFromEnv();
    if (!store) return fail(503, "Ticketing not configured");

    let body: { action?: unknown; ticketSecret?: unknown; itemId?: unknown };
    try {
      body = await request.json();
    } catch {
      return fail(400, "Invalid JSON body");
    }
    const action = body.action === "buy" ? "buy" : body.action === "status" ? "status" : null;
    const ticketSecret = typeof body.ticketSecret === "string" ? body.ticketSecret : "";
    if (!action || !ticketSecret) return fail(400, "action and ticketSecret are required");

    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return fail(401, "Missing auth token");
    const {
      data: { user },
      error: authError,
    } = await createClient(supabaseUrl, supabaseAnonKey).auth.getUser(token);
    if (authError || !user?.email) return fail(401, "Invalid or expired session");

    const { orders } = await getTicketsForUser(
      { email: user.email, links: await listLinks(user.id, store.eventSlug) },
      store
    );
    const order = orders.find((o) => o.tickets.some((t) => t.secret === ticketSecret));
    const ticket = order?.tickets.find((t) => t.secret === ticketSecret);
    if (!order || !ticket) return fail(403, "No matching ticket for this account");
    if (ticket.admission !== true) return fail(400, "Only event tickets can add swag");
    if (ticket.hasCheckedIn !== true) return fail(403, "Extra swag unlocks once your ticket is checked in at the venue");

    const [catalog, categories, event] = await Promise.all([loadCatalog(store), loadCategories(store), eventInfo(store)]);
    const offers = await Promise.all(
      swagAdditionOffers(ticket.itemId, [...catalog.values()], categories).map(async (base) => {
        const code = swagVoucherCode({ ...ticket, orderCode: order.orderCode }, base.itemId);
        const voucher = await findVoucher(store, code);
        // Mirrored like every swag photo, so the card can load it in CORS mode and the SW caches it.
        const imageUrl = base.imageUrl ? await mirrorPicture(base.imageUrl) : undefined;
        const offer: SwagAdditionOffer = {
          ...base,
          imageUrl,
          currency: event.currency,
          remaining: remainingUses(voucher, base.max),
        };
        return { offer, code, voucher };
      })
    );

    if (action === "status") {
      return NextResponse.json({ success: true, data: { offers: offers.map((o) => o.offer) } });
    }

    const chosen = offers.find((o) => o.offer.itemId === body.itemId);
    if (!chosen) return fail(400, "Unknown product");
    if (chosen.offer.remaining === 0) return fail(409, `You already got the extra ${chosen.offer.name} for this ticket`);
    if (chosen.voucher) {
      const patch = voucherFixes(chosen.voucher, chosen.offer.price, chosen.offer.max);
      if (patch) await updateVoucher(store, chosen.voucher.id, patch);
    } else {
      await createVoucher(
        store,
        swagVoucherPayload({
          itemId: chosen.offer.itemId,
          max: chosen.offer.max,
          code: chosen.code,
          price: chosen.offer.price,
          ticketRef: ticketRef({ orderCode: order.orderCode, positionNumber: ticket.positionNumber }),
        })
      );
    }
    return NextResponse.json({
      success: true,
      data: { url: `${event.publicUrl}redeem?voucher=${encodeURIComponent(chosen.code)}` },
    });
  } catch (err) {
    console.error("[/api/swag-additions] error:", err);
    return fail(500, "Something went wrong, please try again");
  }
}

const headersFor = (store: PretixStore) => ({
  Authorization: `Token ${store.apiKey}`,
  "Content-Type": "application/json",
});
const eventBase = (store: PretixStore) =>
  `${store.url}/api/v1/organizers/${store.organizerSlug}/events/${store.eventSlug}`;

/** Currency and shop URL (the redeem page lives under it). Cached an hour. */
async function eventInfo(store: PretixStore): Promise<{ currency: string; publicUrl: string }> {
  const res = await fetch(`${eventBase(store)}/`, { headers: headersFor(store), next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Pretix event ${res.status}`);
  const event = await res.json();
  const publicUrl = String(event.public_url || `${store.url}/${store.organizerSlug}/${store.eventSlug}/`);
  return { currency: event.currency || "USD", publicUrl: publicUrl.endsWith("/") ? publicUrl : `${publicUrl}/` };
}

type Voucher = {
  id: number;
  code: string;
  max_usages: number;
  redeemed: number;
  price_mode: string;
  value: string | null;
  valid_until: string | null;
};

async function findVoucher(store: PretixStore, code: string): Promise<Voucher | null> {
  const res = await fetch(`${eventBase(store)}/vouchers/?code=${encodeURIComponent(code)}`, {
    headers: headersFor(store),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Pretix vouchers ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).find((v: Voucher) => v.code === code) ?? null;
}

async function updateVoucher(store: PretixStore, id: number, patch: Record<string, unknown>) {
  const res = await fetch(`${eventBase(store)}/vouchers/${id}/`, {
    method: "PATCH",
    headers: headersFor(store),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Pretix voucher update failed ${res.status}: ${await res.text()}`);
}

async function createVoucher(store: PretixStore, payload: ReturnType<typeof swagVoucherPayload>) {
  const res = await fetch(`${eventBase(store)}/vouchers/`, {
    method: "POST",
    headers: headersFor(store),
    body: JSON.stringify(payload),
  });
  if (res.ok) return;
  const text = await res.text();
  // Two taps at once: the other request created it first, which is fine.
  if (res.status === 400 && /already exists/i.test(text)) return;
  throw new Error(`Pretix voucher creation failed ${res.status}: ${text}`);
}
