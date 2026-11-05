import { createHash } from "node:crypto";
import { SWAG_ADDITIONS_VALID_UNTIL, type SwagAdditionOffer } from "@/data/tickets/swagAdditions";
import type { Order, TicketAddon } from "@/data/tickets/types";
import type { PretixItem } from "../tickets/pretix";
import { INDIA_FLAG } from "@/components/ticket/ticketTheme";

/**
 * Everything here is read from how the event is set up in Pretix, so a new
 * addition product needs no code change:
 * - who: tickets whose product offered swag at checkout (any add-on category;
 *   in this event they are all merchandise). Under-3 children, lost
 *   wristbands and the like offered none, so they get none;
 * - the products: the active items in the "Swag Additions" category (voucher
 *   only in Pretix, so they are only sold through this flow);
 * - the limit per ticket: each one's "max per order";
 * - the price: the addition's own, unless the ticket's product offered the
 *   same product from the "Discounted Swag" category, or is an India product
 *   (the 🇮🇳 flag the ticketing team puts on India-priced products), then
 *   that price. Other discounts (free swag, discounted premium add-ons) do
 *   not carry over, so the chess set stays full price for everyone.
 * Products match by name without its trailing "(...)", e.g. "Devcon India
 * Scarf (Addition)" and "Devcon India Scarf (Discounted)".
 */
export const ADDITIONS_CATEGORY = "Swag Additions";
export const CARRIED_DISCOUNT_CATEGORY = "Discounted Swag";

const nameOf = (item: PretixItem) => (typeof item.name === "object" ? item.name.en : item.name) ?? "";
/** "Devcon India Scarf (Addition)" → "Devcon India Scarf". */
const baseName = (item: PretixItem) => nameOf(item).replace(/\s*\([^)]*\)\s*$/, "").trim();
const sameProduct = (a: PretixItem, b: PretixItem) => baseName(a).toLowerCase() === baseName(b).toLowerCase();

const categoryIdsNamed = (categories: Map<number, string>, name: string) =>
  new Set([...categories].filter(([, n]) => n.trim().toLowerCase() === name.toLowerCase()).map(([id]) => id));

/** Every addition product, active or not: one switched off may still have been bought. */
export function additionItemIds(items: PretixItem[], categories: Map<number, string>): number[] {
  const ids = categoryIdsNamed(categories, ADDITIONS_CATEGORY);
  return items.filter((i) => i.category != null && ids.has(Number(i.category))).map((i) => i.id);
}

type Offer = Omit<SwagAdditionOffer, "currency" | "remaining">;

/** The additions a ticket of product `ticketItemId` can buy, with price and per-ticket limit. */
export function swagAdditionOffers(
  ticketItemId: number | undefined,
  items: PretixItem[],
  categories: Map<number, string>
): Offer[] {
  const additionCategories = categoryIdsNamed(categories, ADDITIONS_CATEGORY);
  const discountCategories = categoryIdsNamed(categories, CARRIED_DISCOUNT_CATEGORY);
  const inCategory = (item: PretixItem, ids: Set<number>) => item.category != null && ids.has(Number(item.category));

  const ticket = items.find((i) => i.id === ticketItemId);
  const offered = new Set((ticket?.addons ?? []).map((a) => a.addon_category));
  if (offered.size === 0) return [];
  const indiaTicket = ticket ? INDIA_FLAG.test(nameOf(ticket)) : false;
  const discounts = items.filter(
    (i) =>
      inCategory(i, discountCategories) && i.category != null && (indiaTicket || offered.has(Number(i.category)))
  );

  return items
    .filter((i) => i.active !== false && inCategory(i, additionCategories) && i.default_price)
    .map((addition) => {
      const discount = discounts.find((d) => sameProduct(d, addition) && d.default_price);
      return {
        itemId: addition.id,
        name: baseName(addition),
        price: (discount?.default_price ?? addition.default_price)!,
        max: addition.max_per_order && addition.max_per_order > 0 ? addition.max_per_order : 1,
        imageUrl: typeof addition.picture === "string" ? addition.picture : undefined,
      };
    });
}

/** "7EUWF-1": order code and ticket number, how the app and Pretix name a ticket. */
export function ticketRef(ticket: { orderCode: string; positionNumber?: number }): string {
  return `${ticket.orderCode}-${ticket.positionNumber ?? "X"}`;
}

/**
 * One voucher per ticket and product, e.g. "7EUWF-1-115-5ADADCB7": readable in
 * Pretix (ticket, product), and asking again returns the same one (no stream
 * of cheap vouchers) with the per-ticket limit as its uses. The last part
 * comes from the ticket secret, so knowing an order code is not enough to
 * use another ticket's voucher (its allowance or its discounted price).
 */
export function swagVoucherCode(
  ticket: { secret: string; orderCode: string; positionNumber?: number },
  itemId: number
): string {
  const check = createHash("sha256").update(`devcon8-swag-addition:${itemId}:${ticket.secret}`).digest("hex");
  return `${ticketRef(ticket)}-${itemId}-${check.slice(0, 8).toUpperCase()}`;
}

/** The Pretix voucher for one ticket's addition. */
export function swagVoucherPayload(opts: { itemId: number; max: number; code: string; price: string; ticketRef: string }) {
  return {
    code: opts.code,
    item: opts.itemId,
    price_mode: "set" as const,
    value: opts.price,
    max_usages: opts.max,
    valid_until: SWAG_ADDITIONS_VALID_UNTIL,
    block_quota: false,
    allow_ignore_quota: false,
    show_hidden_items: true,
    tag: "app-swag-addition",
    comment: `Event app swag addition for ticket ${opts.ticketRef}`,
  };
}

/**
 * The patch that brings an existing voucher back in line with the app, or
 * null when it already is: its price (a voucher edited by hand in Pretix, say
 * to $0 for a test, must not stay live at another price), its uses (the
 * per-ticket limit, if "max per order" changed in Pretix since; never below
 * what was already used) and its expiry (SWAG_ADDITIONS_VALID_UNTIL).
 */
export function voucherFixes(
  voucher: { price_mode: string; value: string | null; max_usages: number; redeemed: number; valid_until?: string | null },
  price: string,
  limit: number
): { price_mode?: "set"; value?: string; max_usages?: number; valid_until?: string } | null {
  const patch: { price_mode?: "set"; value?: string; max_usages?: number; valid_until?: string } = {};
  if (voucher.price_mode !== "set" || Number(voucher.value) !== Number(price)) {
    patch.price_mode = "set";
    patch.value = price;
  }
  const uses = Math.max(limit, voucher.redeemed);
  if (voucher.max_usages !== uses) patch.max_usages = uses;
  if (
    voucher.valid_until !== undefined &&
    (voucher.valid_until === null || Date.parse(voucher.valid_until) !== Date.parse(SWAG_ADDITIONS_VALID_UNTIL))
  ) {
    patch.valid_until = SWAG_ADDITIONS_VALID_UNTIL;
  }
  return Object.keys(patch).length ? patch : null;
}

/** Uses left for a ticket: the current per-ticket limit minus what its voucher was used for. */
export function remainingUses(voucher: { redeemed: number } | null, limit: number): number {
  return Math.max(0, limit - (voucher?.redeemed ?? 0));
}

/**
 * Extra swag belongs to the ticket whose voucher bought it, whatever email
 * checked out: each found position becomes an add-on of that ticket (shown
 * with it, with its own QR), and its copy in a swag-only order that came in
 * by email is dropped. Pure; `found` comes from attach.ts.
 */
export function mergeSwagAdditions(orders: Order[], found: Array<{ ticketSecret: string; addon: TicketAddon }>): Order[] {
  if (found.length === 0) return orders;
  const moved = new Set(found.map((f) => f.addon.secret));
  return orders
    .map((order) => ({
      ...order,
      tickets: order.tickets
        .filter((ticket) => !moved.has(ticket.secret))
        .map((ticket) => {
          const extra = found
            .filter((f) => f.ticketSecret === ticket.secret && !ticket.addons.some((a) => a.secret === f.addon.secret))
            .map((f) => f.addon);
          return extra.length ? { ...ticket, addons: [...ticket.addons, ...extra] } : ticket;
        }),
    }))
    .filter((order) => order.tickets.length > 0);
}

/** Marks the tickets that can buy extra swag (`Ticket.swagAdditions`), so the card shows only for them. */
export function flagSwagAdditionTickets(orders: Order[], eligible: Set<string>): Order[] {
  if (eligible.size === 0) return orders;
  return orders.map((order) => ({
    ...order,
    tickets: order.tickets.map((ticket) => (eligible.has(ticket.secret) ? { ...ticket, swagAdditions: true } : ticket)),
  }));
}
