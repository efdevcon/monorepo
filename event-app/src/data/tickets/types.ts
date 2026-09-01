/**
 * Visual treatment of a ticket card (Figma Dev Handoff 5088-*): India-themed
 * products, "golden" tickets (early birds, volunteers, speakers, supporters),
 * or the default Devcon look. Resolved client-side from the item name in
 * `components/ticket/ticketTheme.ts`; the server can pin it per item id via
 * TICKET_STYLE_*_ITEM_IDS env overrides (see api/tickets/pretix.ts).
 */
export type TicketStyle = "devcon" | "golden" | "india";

/** A swag/add-on item attached to a ticket (e.g. a t-shirt). */
export interface TicketAddon {
  id: number;
  secret: string;
  itemName: string;
  description?: string;
  price: string;
  attendeeName: string | null;
  category?: string;
  active?: boolean;
  /** Pretix item `picture` URL, shown on the swag card. */
  imageUrl?: string;
}

/** A single attendee ticket within an order. `secret` encodes the QR code. */
export interface Ticket {
  secret: string;
  attendeeName: string | null;
  attendeeEmail: string;
  price: string;
  itemId?: number;
  itemName: string;
  itemDescription?: string;
  /**
   * Pretix's `admission` flag: true for real entry tickets, false for
   * merchandise. Load-bearing for partner proofs — some swag is sold as a
   * standalone position rather than an add-on, so "not an add-on" is not the
   * same question as "is a ticket".
   */
  admission?: boolean;
  addons: TicketAddon[];
  hasCheckedIn?: boolean;
  /** Pretix item `picture` URL (standalone swag positions render as swag cards). */
  imageUrl?: string;
  /** Server-pinned card style (env item-id override); client falls back to name matching. */
  style?: TicketStyle;
}

/** A paid Pretix order, holding one or more tickets. */
export interface Order {
  orderCode: string;
  orderDate: string;
  email: string;
  eventName?: string;
  eventSlug?: string;
  eventId?: number | null;
  tickets: Ticket[];
}

/** Shape returned by the `/api/tickets` route. */
export interface TicketsResponse {
  success: boolean;
  data?: { tickets: Order[] };
  error?: string;
}
