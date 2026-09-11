import type { Order, Ticket } from "@/data/tickets/types";

/**
 * Test fixture for the signed-in ticket UI, enabled per environment through
 * TICKET_TEST_INDIA_ORDER_CODE (order codes never live in source). Syntax:
 * "CODE" or "CODE:N", comma-separated for several orders.
 *
 * Each listed order that belongs to the signed-in user spawns a separate fake
 * order, coded `TEST-<code>` so it can never be mistaken for a real one, with:
 * - N fake India Resident admission tickets (tier "india" for the ENS proof
 *   flow: classifyTier keys off the flag emoji in the name), exercising the
 *   multi-ticket layout when N > 1;
 * - two fake add-ons on the first of them: a t-shirt, and a Chess Set marked
 *   collected to show the swag pickup state. All real swag is sold as add-ons
 *   too, so there is no standalone merchandise in the fixture. Fixture tickets
 *   carry synthetic negative position ids so they can be chosen like a real
 *   ticket (the server skips Pretix for those), which is how the fixture
 *   swag and the India card get previewed.
 *
 * Swag borrows the real catalog item's name and photo when one matches, so the
 * cards look like production. Fake secrets never resolve in Pretix, so their
 * QR codes scan to nothing and partner proofs for them are rejected server-side.
 */

export interface FixtureOrder {
  code: string;
  count: number;
}

/** Negative position ids for fixture tickets: unique per fixture order and ticket, never a Pretix id. */
export function fixturePositionId(fixtureIndex: number, ticketNumber: number): number {
  return -(fixtureIndex * 100 + ticketNumber);
}

export const isFixturePositionId = (positionId: number): boolean => positionId < 0;

export function parseFixture(raw: string | undefined): FixtureOrder[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [code, count] = entry.split(":");
      return {
        code: code.toUpperCase(),
        count: Math.max(1, Number.parseInt(count ?? "1", 10) || 1),
      };
    });
}

export interface CatalogItem {
  name: string;
  picture?: string | null;
}

interface SwagItem {
  name: string;
  picture?: string | null;
}

export interface FixtureSwag {
  shirt: SwagItem;
  chessSet: SwagItem;
}

function pick(
  catalog: CatalogItem[],
  match: RegExp,
  fallback: string,
  variation?: string
): SwagItem {
  const item = catalog.find((entry) => match.test(entry.name));
  const name = item?.name ?? fallback;
  // Same "<item> - <variation>" formatting as real add-ons in pretix.ts.
  return { name: variation ? `${name} - ${variation}` : name, picture: item?.picture };
}

/** The fixture's swag, resolved against the live catalog. */
export function resolveFixtureSwag(catalog: CatalogItem[]): FixtureSwag {
  return {
    shirt: pick(
      catalog,
      /^premium oversized ethereum shirt$/i,
      "Premium Oversized Ethereum Shirt",
      "L"
    ),
    chessSet: pick(catalog, /^ethereum chess set$/i, "Ethereum Chess Set"),
  };
}

export function applyFixture(
  orders: Order[],
  opts: {
    fixture: FixtureOrder[];
    email: string;
    swag: FixtureSwag;
    /** Mirrored (CORS-enabled) URL for a catalog picture, see pretix.ts. */
    pictureUrl: (picture: string | null | undefined) => string | undefined;
  }
): void {
  for (const [fixtureIndex, { code, count }] of opts.fixture.entries()) {
    const order = orders.find((entry) => entry.orderCode === code);
    if (!order) continue;
    const tag = code.toLowerCase();
    const holder = order.tickets[0]?.attendeeName ?? null;
    // Own order, own code: the fake tickets must not read as part of the real
    // order (and the fake code keeps them out of anything keyed by order).
    const fake: Order = {
      orderCode: `TEST-${code}`,
      orderDate: order.orderDate,
      email: order.email,
      eventName: order.eventName,
      eventSlug: order.eventSlug,
      eventId: order.eventId,
      tickets: [],
    };
    orders.push(fake);

    for (let i = 1; i <= count; i++) {
      const ticket: Ticket = {
        secret: `test-india-resident-${tag}-${i}`,
        attendeeName: holder,
        attendeeEmail: opts.email,
        price: "129.00",
        itemId: 999999,
        itemName: "India Resident \u{1F1EE}\u{1F1F3}",
        itemDescription: "Test ticket for the ENS proof flow",
        admission: true,
        addons: [],
        hasCheckedIn: false,
        test: true,
        // Synthetic, negative: choosable like a real ticket in dev, never a
        // Pretix id (see getTicketsForUser, which skips Pretix for these).
        positionId: fixturePositionId(fixtureIndex, i),
        positionNumber: i,
      };
      if (i === 1) {
        // Both fake swag items ride on the first fake ticket, which can be
        // chosen like a real one, so the swag shelf can be previewed.
        ticket.addons.push(
          {
            id: 999998,
            secret: `test-shirt-${tag}`,
            itemName: opts.swag.shirt.name,
            price: "0.00",
            attendeeName: holder,
            imageUrl: opts.pictureUrl(opts.swag.shirt.picture),
          },
          {
            id: 999997,
            secret: `test-chess-set-${tag}`,
            itemName: opts.swag.chessSet.name,
            price: "0.00",
            attendeeName: holder,
            imageUrl: opts.pictureUrl(opts.swag.chessSet.picture),
            // Shows the swag pickup state; the shirt stays unclaimed.
            collected: true,
          }
        );
      }
      fake.tickets.push(ticket);
    }

  }
}
