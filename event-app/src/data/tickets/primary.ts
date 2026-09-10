import type { Order, Ticket } from "./types";

/** `admission === false` is merchandise; undefined (older cache, unresolved item) still counts as a ticket. */
export const isAdmission = (ticket: Ticket): boolean => ticket.admission !== false;

/** Every admission ticket across orders, in server order (attached first). */
export function admissionTickets(orders: Order[]): Ticket[] {
  return orders.flatMap((order) => order.tickets.filter(isAdmission));
}

/**
 * "My ticket" (spec: Account and attached ticket): the first attached
 * admission ticket; else the only admission ticket matched by email; else
 * none, and the ticket tab asks.
 */
export function derivePrimary(orders: Order[]): Ticket | null {
  const tickets = admissionTickets(orders);
  const attached = tickets.find((ticket) => ticket.attached);
  if (attached) return attached;
  return tickets.length === 1 ? tickets[0] : null;
}

export type TicketPrompt = "choose" | "none" | null;

/** Which prompt the ticket tab shows when there is no primary ticket. */
export function ticketPrompt(orders: Order[]): TicketPrompt {
  if (derivePrimary(orders)) return null;
  return admissionTickets(orders).length === 0 ? "none" : "choose";
}

/**
 * User-facing ticket numbers, 1..n per order over every admission ticket the
 * account sees on that order (chosen one included, so numbers do not shift
 * after a choice). Pretix's own position numbers can have gaps once a ticket
 * went to another holder, which read like a bug; these never do. Keyed by
 * ticket secret.
 */
export function ticketOrdinals(orders: Order[]): Map<string, number> {
  const byOrder = new Map<string, Ticket[]>();
  for (const order of orders) {
    const list = byOrder.get(order.orderCode) ?? [];
    list.push(...order.tickets.filter(isAdmission));
    byOrder.set(order.orderCode, list);
  }
  const ordinals = new Map<string, number>();
  for (const list of byOrder.values()) {
    list
      .sort((a, b) => (a.positionNumber ?? 0) - (b.positionNumber ?? 0))
      .forEach((ticket, index) => ordinals.set(ticket.secret, index + 1));
  }
  return ordinals;
}

/** One selectable row per admission ticket matched by email (the "Which ticket is yours?" list). */
export interface TicketChoice {
  /** Present for real Pretix positions; absent on payloads cached by older builds (not choosable until a refresh). */
  positionId?: number;
  /** User-facing number within its order (see ticketOrdinals). */
  ordinal: number;
  secret: string;
  itemName: string;
  holder: string;
  addons: string[];
  orderCode: string;
  /** Other accounts that attached this ticket (its holder, most likely). */
  sharedWith?: number;
  /** Fixture ticket (dev/preview only). */
  test?: boolean;
}

/**
 * The account's email-matched admission tickets as choices. Attached tickets
 * are excluded (the prompt only shows while none is attached anyway); order
 * matches the server's.
 */
export function ticketChoices(orders: Order[]): TicketChoice[] {
  const ordinals = ticketOrdinals(orders);
  return orders.flatMap((order) =>
    order.tickets
      .filter((ticket) => isAdmission(ticket) && !ticket.attached)
      .map((ticket) => ({
        positionId: ticket.positionId,
        ordinal: ordinals.get(ticket.secret) ?? 1,
        secret: ticket.secret,
        itemName: ticket.itemName,
        holder: ticket.attendeeName || ticket.attendeeEmail,
        addons: (ticket.addons ?? []).map((addon) => addon.itemName),
        orderCode: order.orderCode,
        sharedWith: ticket.sharedWith,
        test: ticket.test,
      }))
  );
}

/** An order the account bought that still holds several admission tickets under its own email. */
export interface BuyerOrder {
  orderCode: string;
  /** The Pretix order page, where attendee emails are changed (buyer only, see Order.url). */
  url: string;
  /** The admission tickets still under the buyer's email, in order, with their user-facing numbers. */
  tickets: Array<{ secret: string; ordinal: number }>;
}

/**
 * Tickets a buyer should hand over in Pretix: every email-matched admission
 * ticket on orders the account placed (the order page URL is present), listed
 * whenever the buyer holds more than one ticket in total, across orders, since
 * at most one of them is their own. The chosen ticket stays in the list, so
 * the block reads the same before and after choosing. Grouped by order code,
 * because a chosen ticket and the rest of its order arrive as separate order
 * objects.
 */
export function buyerOrdersToAssign(orders: Order[]): BuyerOrder[] {
  const ordinals = ticketOrdinals(orders);
  const byCode = new Map<string, BuyerOrder>();
  let total = 0;
  for (const order of orders) {
    if (!order.url) continue;
    const entry = byCode.get(order.orderCode) ?? { orderCode: order.orderCode, url: order.url, tickets: [] };
    for (const ticket of order.tickets) {
      // Real Pretix positions only: fixture tickets have no id and no page.
      if (!isAdmission(ticket) || ticket.positionId === undefined) continue;
      total++;
      entry.tickets.push({ secret: ticket.secret, ordinal: ordinals.get(ticket.secret) ?? 1 });
    }
    byCode.set(order.orderCode, entry);
  }
  if (total < 2) return [];
  return [...byCode.values()]
    .filter((entry) => entry.tickets.length > 0)
    .map((entry) => ({
      ...entry,
      tickets: [...entry.tickets].sort((a, b) => a.ordinal - b.ordinal),
    }));
}
