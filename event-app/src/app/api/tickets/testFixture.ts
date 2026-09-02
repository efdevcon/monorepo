import type { Order, Ticket, TicketAddon } from "@/data/tickets/types";

/**
 * Test fixture for the signed-in ticket UI, enabled per environment through
 * TICKET_TEST_INDIA_ORDER_CODE (order codes never live in source). Syntax:
 * "CODE" or "CODE:N", comma-separated for several orders.
 *
 * Each listed order that belongs to the signed-in user gets:
 * - N fake India Resident admission tickets (tier "india" for the ENS proof
 *   flow: classifyTier keys off the flag emoji in the name), exercising the
 *   multi-ticket layout when N > 1;
 * - a fake t-shirt add-on on the first of them, and a fake standalone Chess
 *   Set position, covering both swag code paths (add-on vs. merchandise sold
 *   as its own position).
 *
 * Swag borrows the real catalog item's name and photo when one matches, so the
 * cards look like production. Fake secrets never resolve in Pretix, so their
 * QR codes scan to nothing and partner proofs for them are rejected server-side.
 */

export interface FixtureOrder {
  code: string;
  count: number;
}

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
  for (const { code, count } of opts.fixture) {
    const order = orders.find((entry) => entry.orderCode === code);
    if (!order) continue;
    const tag = code.toLowerCase();
    const holder = order.tickets[0]?.attendeeName ?? null;

    for (let i = 1; i <= count; i++) {
      const addons: TicketAddon[] = [];
      if (i === 1) {
        addons.push({
          id: 999998,
          secret: `test-shirt-${tag}`,
          itemName: opts.swag.shirt.name,
          price: "0.00",
          attendeeName: holder,
          imageUrl: opts.pictureUrl(opts.swag.shirt.picture),
        });
      }
      const ticket: Ticket = {
        secret: `test-india-resident-${tag}-${i}`,
        attendeeName: holder,
        attendeeEmail: opts.email,
        price: "129.00",
        itemId: 999999,
        itemName: "India Resident \u{1F1EE}\u{1F1F3}",
        itemDescription: "Test ticket for the ENS proof flow",
        admission: true,
        addons,
        hasCheckedIn: false,
      };
      order.tickets.push(ticket);
    }

    order.tickets.push({
      secret: `test-chess-set-${tag}`,
      attendeeName: holder,
      attendeeEmail: opts.email,
      price: "0.00",
      itemId: 999997,
      itemName: opts.swag.chessSet.name,
      admission: false,
      addons: [],
      hasCheckedIn: false,
      imageUrl: opts.pictureUrl(opts.swag.chessSet.picture),
    });
  }
}
