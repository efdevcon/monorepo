import type { Order } from "@/data/tickets/types";
import { addonsBoughtWithVoucher, loadCatalog, loadCategories, type PretixStore } from "../tickets/pretix";
import { additionItemIds, flagSwagAdditionTickets, mergeSwagAdditions, swagAdditionOffers, swagVoucherCode } from "./additions";

/**
 * Extra swag follows the ticket that bought it, not the checkout email: each
 * ticket's addition vouchers are derived from its secret (additions.ts), so
 * the paid positions bought with them are looked up by code and attached to
 * that ticket as add-ons (mergeSwagAdditions). Tickets that can buy more are
 * flagged for the card (flagSwagAdditionTickets). Vouchers only exist for
 * checked-in event tickets, so only those are looked up: one Pretix call per
 * such ticket and addition product.
 */
export async function withSwagAdditions(orders: Order[], store: PretixStore): Promise<Order[]> {
  const tickets = orders.flatMap((order) =>
    order.tickets
      .filter((t) => t.admission === true && t.hasCheckedIn === true)
      .map((t) => ({ ...t, orderCode: order.orderCode }))
  );
  if (tickets.length === 0) return orders;
  const [catalog, categories] = await Promise.all([loadCatalog(store), loadCategories(store)]);
  const items = [...catalog.values()];
  const itemIds = additionItemIds(items, categories);
  if (itemIds.length === 0) return orders;
  const eligible = new Set(
    tickets.filter((t) => swagAdditionOffers(t.itemId, items, categories).length > 0).map((t) => t.secret)
  );
  const found = await Promise.all(
    tickets.flatMap((ticket) =>
      itemIds.map(async (itemId) =>
        (await addonsBoughtWithVoucher(swagVoucherCode(ticket, itemId), store, catalog)).map((addon) => ({
          ticketSecret: ticket.secret,
          addon,
        }))
      )
    )
  );
  return flagSwagAdditionTickets(mergeSwagAdditions(orders, found.flat()), eligible);
}
