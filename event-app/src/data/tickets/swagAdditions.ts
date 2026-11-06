/**
 * Swag additions: an attendee buys extra swag in the app at the price their
 * ticket was offered. The route (api/swag-additions) reads the products, their
 * prices and per-ticket limits from the event's Pretix setup (additions.ts),
 * creates the ticket's one-time voucher for the "(Addition)" product, which
 * Pretix only sells with one, and checkout happens on Pretix.
 */

/** Vouchers stop working at 3 pm on the last day (Mumbai time), leaving time to collect at the Swag Station. */
export const SWAG_ADDITIONS_VALID_UNTIL = "2026-11-06T15:00:00+05:30";

/** Event tickets once checked in: swag is collected at the venue, so buying before arriving is not offered. */
export function swagAdditionEligible(ticket: { admission?: boolean; hasCheckedIn?: boolean }): boolean {
  return ticket.admission !== false && ticket.hasCheckedIn === true;
}

/**
 * Sold out at the Swag Station, matched by product name: the card shows
 * "Sold out" instead of Buy and the route refuses new vouchers.
 */
const SOLD_OUT = [/shirt/i];

export function swagAdditionSoldOut(offer: { name: string }): boolean {
  return SOLD_OUT.some((re) => re.test(offer.name));
}

/** One product as the card shows it. */
export interface SwagAdditionOffer {
  /** The Pretix "(Addition)" item. */
  itemId: number;
  name: string;
  /** Pretix decimal string, e.g. "7.00". */
  price: string;
  currency: string;
  /** Left for this ticket. */
  remaining: number;
  /** The per-ticket limit. */
  max: number;
  imageUrl?: string;
}
