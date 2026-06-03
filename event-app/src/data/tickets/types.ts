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
  addons: TicketAddon[];
  hasCheckedIn?: boolean;
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
