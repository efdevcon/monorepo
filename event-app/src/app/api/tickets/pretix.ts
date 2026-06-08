import type { Order } from "@/data/tickets/types";

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
  has_variations?: boolean;
  variations?: Array<{
    id: number;
    value: string | { en: string; [key: string]: string };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

const localized = (
  value: string | { en: string; [key: string]: string } | undefined
): string | undefined => (typeof value === "object" ? value?.en : value);

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

  // SECURITY: Pretix `search` matches orders by contact email too, so an order
  // can contain positions assigned to OTHER attendees. The signed-in user must
  // only ever get their OWN tickets — keep only positions whose attendee email
  // (falling back to the order email) equals the authenticated email.
  const wanted = email.toLowerCase();
  const ownedByUser = (p: any, orderEmail: string) =>
    (p.attendee_email || orderEmail || "").toLowerCase() === wanted;

  return orders
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
            };
          });

        const checkins = Array.isArray(position.checkins)
          ? position.checkins
          : [];

        return {
          secret: position.secret,
          attendeeName: position.attendee_name,
          attendeeEmail: position.attendee_email || order.email,
          price: position.price,
          itemId: position.item,
          itemName:
            localized(mainItem?.name) || position.item_name || "Ticket",
          itemDescription: localized(mainItem?.description),
          addons,
          hasCheckedIn: checkins.length > 0,
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
}
