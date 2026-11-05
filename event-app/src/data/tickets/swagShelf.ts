/** What the shelf filter needs to know about a swag item. */
export interface ShelfItem {
  secret: string;
  /** The admission ticket this swag goes with (itself for standalone merchandise). */
  ownerSecret: string;
  /** Sold as its own position rather than as an add-on of a ticket. */
  standalone: boolean;
  orderCode: string;
  /** Its order holds no admission ticket at all: swag bought on its own (swag additions). */
  swagOnlyOrder: boolean;
}

/**
 * The swag shown beside a primary ticket: its add-ons, merchandise sold on the
 * same order, and swag-only orders (extra swag bought later, which arrives as
 * its own order). A colleague's add-ons and merchandise on another ticket's
 * order stay hidden. Without a primary, everything shows.
 */
export function shelfSwag<T extends ShelfItem>(
  items: T[],
  lead: { secret: string } | null,
  leadOrderCode: string | undefined
): T[] {
  if (!lead) return items;
  return items.filter(
    (item) =>
      item.ownerSecret === lead.secret ||
      (item.standalone && (item.orderCode === leadOrderCode || item.swagOnlyOrder))
  );
}
