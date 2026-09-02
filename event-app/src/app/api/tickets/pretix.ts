import type { Order, TicketStyle } from "@/data/tickets/types";
import { mirrorPicture } from "./pictures";
import { applyFixture, parseFixture, resolveFixtureSwag } from "./testFixture";

export interface PretixStore {
  url: string;
  organizerSlug: string;
  eventSlug: string;
  eventName: string;
  eventId?: number;
  apiKey: string;
}

interface PretixItem {
  id: number;
  name: string | { en: string; [key: string]: string };
  description?: string | { en: string; [key: string]: string };
  category?: string;
  active?: boolean;
  /** True for entry tickets, false for merchandise. */
  admission?: boolean;
  /** Product photo URL (shown on swag cards). */
  picture?: string | null;
  has_variations?: boolean;
  variations?: Array<{
    id: number;
    value: string | { en: string; [key: string]: string };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/** Build the Pretix store from env. Returns null if not configured. */
export function getStoreFromEnv(): PretixStore | null {
  const apiKey = process.env.PRETIX_API_KEY;
  const organizerSlug = process.env.PRETIX_ORGANIZER;
  const eventSlug = process.env.PRETIX_EVENT;
  if (!apiKey || !organizerSlug || !eventSlug) return null;

  return {
    url: process.env.PRETIX_API_URL || "https://ticketh.xyz",
    organizerSlug,
    eventSlug,
    eventName: process.env.PRETIX_EVENT_NAME || "Devcon",
    apiKey,
  };
}

const localized = (
  value: string | { en: string; [key: string]: string } | undefined
): string | undefined => (typeof value === "object" ? value?.en : value);

/** Comma-separated item-id list from env; null when unset/unparseable. */
function parseItemIdList(raw: string | undefined): Set<number> | null {
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((id) => Number.isInteger(id));
  return ids.length > 0 ? new Set(ids) : null;
}

/**
 * Optional per-item card-style pins (TICKET_STYLE_INDIA_ITEM_IDS /
 * TICKET_STYLE_GOLDEN_ITEM_IDS). Unlike the ticket-proof override these lists
 * only ADD certainty: unlisted items return undefined and the client falls
 * back to item-name keywords (components/ticket/ticketTheme.ts).
 */
function styleForItem(itemId: number): TicketStyle | undefined {
  const indiaIds = parseItemIdList(process.env.TICKET_STYLE_INDIA_ITEM_IDS);
  if (indiaIds?.has(itemId)) return "india";
  const goldenIds = parseItemIdList(process.env.TICKET_STYLE_GOLDEN_ITEM_IDS);
  if (goldenIds?.has(itemId)) return "golden";
  return undefined;
}

/**
 * Extract the short variation value from an addon (e.g. "Large (L)" -> "L").
 */
function getVariationValue(
  addon: { variation?: number },
  itemDetails: PretixItem | undefined
): string | null {
  if (!addon.variation || !itemDetails?.has_variations || !itemDetails.variations) {
    return null;
  }
  const variation = itemDetails.variations.find((v) => v.id === addon.variation);
  if (!variation) return null;

  const fullValue = localized(variation.value) ?? "";
  const match = fullValue.match(/\(([^)]+)\)/);
  return match ? match[1] : fullValue;
}

/**
 * Fetch paid Pretix orders for an email and normalize them into Orders.
 * Ported from devconnect-app's getPaidTicketsByEmail, generalized to a single
 * configurable store.
 */
export async function getPaidTicketsByEmail(
  email: string,
  store: PretixStore
): Promise<Order[]> {
  if (!store.apiKey) throw new Error("PRETIX_API_KEY is missing");

  const headers = {
    Authorization: `Token ${store.apiKey}`,
    "Content-Type": "application/json",
  };
  const base = `${store.url}/api/v1/organizers/${store.organizerSlug}/events/${store.eventSlug}`;

  // Item catalog (product names, variations) — changes rarely, so cache it.
  const itemsResponse = await fetch(`${base}/items/`, {
    headers,
    next: { revalidate: 3600 },
  });
  if (!itemsResponse.ok) {
    throw new Error(`Failed to fetch items: ${itemsResponse.status}`);
  }
  const itemsData = await itemsResponse.json();
  const itemsMap = new Map<number, PretixItem>(
    (itemsData.results ?? []).map((item: PretixItem) => [item.id, item])
  );

  // Paid orders matching this email.
  const params = new URLSearchParams({ status: "p", search: email });
  const response = await fetch(`${base}/orders?${params}`, { headers });
  if (!response.ok) {
    throw new Error(`Pretix API error: ${response.status}`);
  }
  const data = await response.json();
  const orders = data.results ?? [];

  // Product photos for this user's positions, mirrored into Storage so the
  // swag cards work offline (see pictures.ts). Keyed by source URL.
  const sources = new Set<string>();
  for (const order of orders) {
    for (const p of order.positions ?? []) {
      const picture = itemsMap.get(p.item)?.picture;
      if (picture) sources.add(picture);
    }
  }
  // Test fixture (see testFixture.ts): mirror the swag photos it borrows too.
  const fixture = parseFixture(process.env.TICKET_TEST_INDIA_ORDER_CODE);
  const fixtureSwag = resolveFixtureSwag(
    [...itemsMap.values()].map((item) => ({
      name: localized(item.name) ?? "",
      picture: item.picture,
    }))
  );
  if (fixture.length > 0) {
    for (const swag of [fixtureSwag.shirt, fixtureSwag.chessSet]) {
      if (swag.picture) sources.add(swag.picture);
    }
  }
  const pictures = new Map<string, string>();
  await Promise.all(
    [...sources].map(async (src) => pictures.set(src, await mirrorPicture(src)))
  );
  const pictureUrl = (picture: string | null | undefined) =>
    picture ? (pictures.get(picture) ?? picture) : undefined;

  // SECURITY: Pretix `search` matches orders by contact email too, so an order
  // can contain positions assigned to OTHER attendees. The signed-in user must
  // only ever get their OWN tickets — keep only positions whose attendee email
  // (falling back to the order email) equals the authenticated email.
  const wanted = email.toLowerCase();
  const ownedByUser = (p: any, orderEmail: string) =>
    (p.attendee_email || orderEmail || "").toLowerCase() === wanted;

  const result = orders
    .map((order: any): Order => {
      // Real tickets are non-add-on positions assigned to the signed-in user.
      const ticketPositions = order.positions.filter(
        (p: any) => !p.addon_to && ownedByUser(p, order.email)
      );

      const tickets = ticketPositions.map((position: any) => {
        const mainItem = itemsMap.get(position.item);

        const addons = order.positions
          .filter((p: any) => p.addon_to === position.id)
          .map((addon: any) => {
            const itemDetails = itemsMap.get(addon.item);
            const variationValue = getVariationValue(addon, itemDetails);
            let itemName =
              localized(itemDetails?.name) || `Item ${addon.item}`;
            if (variationValue) itemName = `${itemName} - ${variationValue}`;

            return {
              id: addon.item,
              secret: addon.secret,
              itemName,
              description: localized(itemDetails?.description),
              price: addon.price,
              attendeeName: addon.attendee_name,
              category: itemDetails?.category,
              active: itemDetails?.active,
              imageUrl: pictureUrl(itemDetails?.picture),
            };
          });

        const checkins = Array.isArray(position.checkins)
          ? position.checkins
          : [];

        // Devcon's Pretix checkout doesn't collect per-attendee names, so
        // `attendee_name` is usually null. Fall back to the order's
        // invoice/billing name before the UI's last-resort email fallback,
        // but only for the buyer's own position: a gifted ticket (attendee
        // email differs from the order email) must not show the buyer's name
        // to its holder.
        const isBuyersOwn =
          !position.attendee_email ||
          position.attendee_email.toLowerCase() ===
            (order.email || "").toLowerCase();

        return {
          secret: position.secret,
          attendeeName:
            position.attendee_name ||
            (isBuyersOwn ? order.invoice_address?.name : null) ||
            null,
          attendeeEmail: position.attendee_email || order.email,
          price: position.price,
          itemId: position.item,
          itemName:
            localized(mainItem?.name) || position.item_name || "Ticket",
          itemDescription: localized(mainItem?.description),
          // Tri-state on purpose: an item the catalog lookup could not resolve
          // stays undefined (client treats it as a ticket), never `false`.
          admission: mainItem ? mainItem.admission === true : undefined,
          addons,
          hasCheckedIn: checkins.length > 0,
          imageUrl: pictureUrl(mainItem?.picture),
          style: styleForItem(position.item),
        };
      });

      return {
        orderCode: order.code,
        orderDate: order.datetime,
        email: order.email,
        eventName: store.eventName,
        eventSlug: store.eventSlug,
        eventId: store.eventId ?? null,
        tickets,
      };
    })
    .filter((order: Order) => order.tickets.length > 0);

  applyFixture(result, { fixture, email, swag: fixtureSwag, pictureUrl });

  return result;
}
