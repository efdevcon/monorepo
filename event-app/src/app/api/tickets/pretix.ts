import type { Order, Ticket, TicketAddon, TicketStyle } from "@/data/tickets/types";
import { mirrorPicture } from "./pictures";
import { applyFixture, isFixturePositionId, parseFixture, resolveFixtureSwag } from "./testFixture";

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

/** The Pretix order-position fields this module reads; everything else stays `unknown`. */
export interface PretixPosition {
  id: number;
  /** Order code. */
  order: string;
  /** Per-order position number, 1-based (printed on the ticket). */
  positionid?: number;
  item: number;
  variation?: number | null;
  price: string;
  attendee_name?: string | null;
  attendee_email?: string | null;
  /** The QR payload. */
  secret: string;
  addon_to?: number | null;
  checkins?: PretixCheckin[];
  canceled?: boolean;
  [key: string]: unknown;
}

/** One scan of a position against a check-in list. */
export interface PretixCheckin {
  /** Check-in list id. */
  list?: number;
  /** "entry" (default) or "exit". */
  type?: string;
  [key: string]: unknown;
}

export interface PretixOrder {
  code: string;
  /** "p" is paid. */
  status: string;
  email: string;
  datetime: string;
  /** Order page URL (carries the order secret). */
  url?: string;
  positions: PretixPosition[];
  invoice_address?: { name?: string } | null;
  [key: string]: unknown;
}

/** How an account proved it holds a ticket (see links.ts). */
export type LinkProof = "email" | "qr";

/** An attached ticket as stored for the account (see links.ts). */
export interface TicketLink {
  positionId: number;
  /** Absent on rows from before the column existed; treated as "qr". */
  proof?: LinkProof;
}

/**
 * A ticket attached by QR proof may belong to an order someone else placed.
 * Possession of the QR is the ticket, not the buyer's identity: strip the
 * buyer's email and names from what the holder gets back (Pretix itself never
 * reveals them from the secret alone), showing the holder as the account.
 */
export function redactBuyerIdentity(order: Order, accountEmail: string): Order {
  const account = accountEmail.toLowerCase();
  const tickets = order.tickets.map((ticket) =>
    ticket.attendeeEmail.toLowerCase() === account
      ? ticket
      : {
          ...ticket,
          attendeeEmail: accountEmail,
          attendeeName: null,
          addons: ticket.addons.map((addon) => ({ ...addon, attendeeName: null })),
        }
  );
  return {
    ...order,
    email: order.email.toLowerCase() === account ? order.email : accountEmail,
    // The order page manages the whole order; never hand it to a QR holder.
    url: order.email.toLowerCase() === account ? order.url : undefined,
    tickets,
  };
}

/**
 * The email-ownership rule: a position belongs to `email` when its attendee
 * email, or the order email when there is none, equals it. Used to select the
 * email-matched tickets and to re-check links that were proven by that match.
 */
export function positionMatchesEmail(
  position: { attendee_email?: string | null },
  orderEmail: string | null | undefined,
  email: string
): boolean {
  return (position.attendee_email || orderEmail || "").toLowerCase() === email.toLowerCase();
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

const headersFor = (store: PretixStore) => ({
  Authorization: `Token ${store.apiKey}`,
  "Content-Type": "application/json",
});

const baseFor = (store: PretixStore) =>
  `${store.url}/api/v1/organizers/${store.organizerSlug}/events/${store.eventSlug}`;

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
 * Whether a swag position was handed over: Pretix only records a check-in
 * against a list that includes the position's product, so any entry-type
 * check-in on a swag position means it was scanned at a pickup point. Exit
 * scans never count. No configuration needed.
 */
export function positionCollected(position: { checkins?: PretixCheckin[] }): boolean {
  return (position.checkins ?? []).some((checkin) => (checkin.type ?? "entry") === "entry");
}

/** Item catalog (product names, variations, photos). Changes rarely, so cached an hour. */
export async function loadCatalog(store: PretixStore): Promise<Map<number, PretixItem>> {
  const res = await fetch(`${baseFor(store)}/items/`, {
    headers: headersFor(store),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Failed to fetch items: ${res.status}`);
  const data = await res.json();
  return new Map<number, PretixItem>(
    (data.results ?? []).map((item: PretixItem) => [item.id, item])
  );
}

type PictureUrl = (picture: string | null | undefined) => string | undefined;

/**
 * Product photos for every position in `orders` (plus `extra` sources),
 * mirrored into Storage so the swag cards work offline (see pictures.ts).
 * Returns the resolver from a Pretix `picture` to the URL the client loads.
 */
async function resolvePictures(
  orders: PretixOrder[],
  itemsMap: Map<number, PretixItem>,
  extra: Iterable<string>
): Promise<PictureUrl> {
  const sources = new Set<string>(extra);
  for (const order of orders) {
    for (const p of order.positions ?? []) {
      const picture = itemsMap.get(p.item)?.picture;
      if (picture) sources.add(picture);
    }
  }
  const pictures = new Map<string, string>();
  await Promise.all(
    [...sources].map(async (src) => pictures.set(src, await mirrorPicture(src)))
  );
  return (picture) => (picture ? (pictures.get(picture) ?? picture) : undefined);
}

/**
 * Normalise one Pretix order into an `Order`, keeping only the positions
 * `keep` accepts (email ownership for the search path, one position id for an
 * attached ticket). Add-ons follow their parent position. Canceled positions
 * (refunded, reissued) are dropped: their QR no longer opens the door.
 */
function normalizeOrder(
  order: PretixOrder,
  opts: {
    itemsMap: Map<number, PretixItem>;
    pictureUrl: PictureUrl;
    store: PretixStore;
    keep: (position: PretixPosition) => boolean;
    attached?: boolean;
    /** The signed-in email: the order page URL is exposed only to the buyer. */
    accountEmail: string;
  }
): Order {
  const { itemsMap, pictureUrl, store } = opts;
  const isBuyer = (order.email || "").toLowerCase() === opts.accountEmail.toLowerCase();
  const positions = order.positions ?? [];

  const tickets = positions
    .filter((p) => !p.addon_to && !p.canceled && opts.keep(p))
    .map((position): Ticket => {
      const mainItem = itemsMap.get(position.item);

      const addons = positions
        .filter((p) => p.addon_to === position.id && !p.canceled)
        .map((addon): TicketAddon => {
          const itemDetails = itemsMap.get(addon.item);
          const variationValue = getVariationValue(
            { variation: addon.variation ?? undefined },
            itemDetails
          );
          let itemName = localized(itemDetails?.name) || `Item ${addon.item}`;
          if (variationValue) itemName = `${itemName} - ${variationValue}`;

          return {
            id: addon.item,
            secret: addon.secret,
            itemName,
            description: localized(itemDetails?.description),
            price: addon.price,
            attendeeName: addon.attendee_name ?? null,
            category: itemDetails?.category,
            active: itemDetails?.active,
            imageUrl: pictureUrl(itemDetails?.picture),
            collected: positionCollected(addon) || undefined,
          };
        });

      const checkins = Array.isArray(position.checkins) ? position.checkins : [];

      // Devcon's Pretix checkout doesn't collect per-attendee names, so
      // `attendee_name` is usually null. Fall back to the order's
      // invoice/billing name before the UI's last-resort email fallback,
      // but only for the buyer's own position: a gifted ticket (attendee
      // email differs from the order email) must not show the buyer's name
      // to its holder.
      const isBuyersOwn =
        !position.attendee_email ||
        position.attendee_email.toLowerCase() === (order.email || "").toLowerCase();

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
          localized(mainItem?.name) ||
          (position.item_name as string | undefined) ||
          "Ticket",
        itemDescription: localized(mainItem?.description),
        // Tri-state on purpose: an item the catalog lookup could not resolve
        // stays undefined (client treats it as a ticket), never `false`.
        admission: mainItem ? mainItem.admission === true : undefined,
        addons,
        hasCheckedIn: checkins.length > 0,
        imageUrl: pictureUrl(mainItem?.picture),
        style: styleForItem(position.item),
        positionId: position.id,
        positionNumber: position.positionid,
        // Absent (not false) on email-matched tickets, so the cached payload
        // shape does not grow for the common case.
        attached: opts.attached || undefined,
      };
    });

  return {
    orderCode: order.code,
    orderDate: order.datetime,
    email: order.email,
    url: isBuyer && order.url ? order.url : undefined,
    eventName: store.eventName,
    eventSlug: store.eventSlug,
    eventId: store.eventId ?? null,
    tickets,
  };
}

/** The dev/preview test fixture (see testFixture.ts), resolved against the catalog. */
function fixtureContext(catalog: Map<number, PretixItem>) {
  const fixture = parseFixture(process.env.TICKET_TEST_INDIA_ORDER_CODE);
  const swag = resolveFixtureSwag(
    [...catalog.values()].map((item) => ({
      name: localized(item.name) ?? "",
      picture: item.picture,
    }))
  );
  const pictures =
    fixture.length > 0
      ? [swag.shirt.picture, swag.chessSet.picture].filter(
          (picture): picture is string => !!picture
        )
      : [];
  return { fixture, swag, pictures };
}

/**
 * Fetch paid Pretix orders for an email and normalize them into Orders.
 * Ported from devconnect-app's getPaidTicketsByEmail, generalized to a single
 * configurable store. `itemsMap` can be passed by callers that already loaded
 * the catalog. The test fixture is applied unless the caller merges these
 * orders with attached ones first and applies it itself (getTicketsForUser).
 */
export async function getPaidTicketsByEmail(
  email: string,
  store: PretixStore,
  itemsMap?: Map<number, PretixItem>,
  { withFixture = true }: { withFixture?: boolean } = {}
): Promise<Order[]> {
  if (!store.apiKey) throw new Error("PRETIX_API_KEY is missing");
  const catalog = itemsMap ?? (await loadCatalog(store));

  // Paid orders matching this email.
  const params = new URLSearchParams({ status: "p", search: email });
  const response = await fetch(`${baseFor(store)}/orders?${params}`, {
    headers: headersFor(store),
  });
  if (!response.ok) {
    throw new Error(`Pretix API error: ${response.status}`);
  }
  const data = await response.json();
  const orders: PretixOrder[] = data.results ?? [];

  // Test fixture (see testFixture.ts): mirror the swag photos it borrows too.
  const fx = fixtureContext(catalog);
  const pictureUrl = await resolvePictures(orders, catalog, fx.pictures);

  // SECURITY: Pretix `search` matches orders by contact email too, so an order
  // can contain positions assigned to OTHER attendees. The signed-in user must
  // only ever get their OWN tickets — keep only positions whose attendee email
  // (falling back to the order email) equals the authenticated email.
  const result = orders
    .map((order) =>
      normalizeOrder(order, {
        itemsMap: catalog,
        pictureUrl,
        store,
        keep: (p) => positionMatchesEmail(p, order.email, email),
        accountEmail: email,
      })
    )
    .filter((order) => order.tickets.length > 0);

  if (withFixture) {
    applyFixture(result, { fixture: fx.fixture, email, swag: fx.swag, pictureUrl });
  }

  return result;
}

/**
 * The position a ticket QR encodes, with its order. Pretix filters
 * `orderpositions` by exact secret; the event is fixed by the URL, so a code
 * from another event simply returns nothing.
 */
export async function getPositionBySecret(
  secret: string,
  store: PretixStore
): Promise<{ position: PretixPosition; order: PretixOrder } | null> {
  const headers = headersFor(store);
  const res = await fetch(
    `${baseFor(store)}/orderpositions/?secret=${encodeURIComponent(secret)}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Pretix API error: ${res.status}`);
  const position: PretixPosition | undefined = (await res.json()).results?.[0];
  if (!position) return null;
  const orderRes = await fetch(
    `${baseFor(store)}/orders/${encodeURIComponent(position.order)}/`,
    { headers }
  );
  if (!orderRes.ok) throw new Error(`Pretix API error: ${orderRes.status}`);
  return { position, order: await orderRes.json() };
}

/**
 * Why a position cannot be attached, as the message the holder sees, or null
 * when it can (paid order, live, a real ticket: not an add-on, not
 * merchandise). Codes are unguessable, so naming the reason leaks nothing.
 */
export function attachRejection(
  position: PretixPosition,
  order: PretixOrder,
  itemsMap: Map<number, PretixItem>
): string | null {
  if (position.addon_to || itemsMap.get(position.item)?.admission === false) {
    return "That's a swag QR code, not a ticket";
  }
  if (position.canceled) return "This ticket was canceled in Pretix";
  if (order.status !== "p") return "This ticket's order isn't paid yet";
  return null;
}

/** A position someone may attach: paid order, live, a real ticket (not an add-on, not merchandise). */
export function isAttachablePosition(
  position: PretixPosition,
  order: PretixOrder,
  itemsMap: Map<number, PretixItem>
): boolean {
  return attachRejection(position, order, itemsMap) === null;
}

/**
 * Everything the account may see: attached positions first (flagged), then
 * email-matched orders. Each link is re-verified against Pretix: a position
 * that is gone, on an unpaid order, or canceled is reported in `deadLinks` so
 * the caller can remove it, and so is an email-proof link whose position no
 * longer carries the account's email (the buyer reassigned that ticket to its
 * holder). A ticket both attached and email-matched appears once, as attached.
 */
export async function getTicketsForUser(
  opts: { email: string; links: TicketLink[] },
  store: PretixStore
): Promise<{ orders: Order[]; deadLinks: number[] }> {
  const itemsMap = await loadCatalog(store);
  const headers = headersFor(store);
  const deadLinks: number[] = [];
  const attachedRaw: Array<{ order: PretixOrder; positionId: number; proof: LinkProof }> = [];

  // Several attached positions can share an order; fetch each order once.
  const orderCache = new Map<string, Promise<PretixOrder | null>>();
  const fetchOrder = (code: string): Promise<PretixOrder | null> => {
    let pending = orderCache.get(code);
    if (!pending) {
      pending = fetch(`${baseFor(store)}/orders/${encodeURIComponent(code)}/`, {
        headers,
      }).then((r) => (r.ok ? (r.json() as Promise<PretixOrder>) : null));
      orderCache.set(code, pending);
    }
    return pending;
  };

  // Fixture tickets (dev/preview) carry negative ids: no Pretix lookup, they
  // are marked attached once the fixture has been applied below.
  const fixtureLinks = opts.links.filter((link) => isFixturePositionId(link.positionId));
  const realLinks = opts.links.filter((link) => !isFixturePositionId(link.positionId));

  await Promise.all(
    realLinks.map(async ({ positionId, proof }) => {
      const res = await fetch(`${baseFor(store)}/orderpositions/${positionId}/`, {
        headers,
      });
      if (res.status === 404) {
        deadLinks.push(positionId);
        return;
      }
      if (!res.ok) throw new Error(`Pretix API error: ${res.status}`);
      const position: PretixPosition = await res.json();
      const order = await fetchOrder(position.order);
      if (!order || !isAttachablePosition(position, order, itemsMap)) {
        deadLinks.push(positionId);
        return;
      }
      if (proof === "email" && !positionMatchesEmail(position, order.email, opts.email)) {
        deadLinks.push(positionId);
        return;
      }
      attachedRaw.push({ order, positionId, proof: proof ?? "qr" });
    })
  );

  const emailOrders = await getPaidTicketsByEmail(opts.email, store, itemsMap, {
    withFixture: false,
  });
  const fx = fixtureContext(itemsMap);
  const pictureUrl = await resolvePictures(
    attachedRaw.map((entry) => entry.order),
    itemsMap,
    fx.pictures
  );
  const attachedOrders = attachedRaw
    .sort((a, b) => a.positionId - b.positionId)
    .map(({ order, positionId, proof }) => {
      const normalized = normalizeOrder(order, {
        itemsMap,
        pictureUrl,
        store,
        keep: (p) => p.id === positionId,
        attached: true,
        accountEmail: opts.email,
      });
      return proof === "qr" ? redactBuyerIdentity(normalized, opts.email) : normalized;
    })
    .filter((order) => order.tickets.length > 0);

  const attachedSecrets = new Set(
    attachedOrders.flatMap((order) => order.tickets.map((ticket) => ticket.secret))
  );
  const rest = emailOrders
    .map((order) => ({
      ...order,
      tickets: order.tickets.filter((ticket) => !attachedSecrets.has(ticket.secret)),
    }))
    .filter((order) => order.tickets.length > 0);

  const orders = [...attachedOrders, ...rest];
  // Applied after the merge, so the fixture lands on the copy of the real
  // ticket that is actually returned (the attached one once it is chosen).
  applyFixture(orders, { fixture: fx.fixture, email: opts.email, swag: fx.swag, pictureUrl });
  for (const { positionId } of fixtureLinks) {
    const holder = orders.find((order) =>
      order.tickets.some((ticket) => ticket.positionId === positionId)
    );
    if (!holder) {
      deadLinks.push(positionId);
      continue;
    }
    for (const ticket of holder.tickets) {
      if (ticket.positionId === positionId) ticket.attached = true;
    }
    // Attached first, like a real one, so it becomes the primary.
    orders.splice(orders.indexOf(holder), 1);
    orders.unshift(holder);
  }
  return { orders, deadLinks };
}
