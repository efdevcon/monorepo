import type { TicketsPayload } from "@/data/tickets/types";
import type { AuthedUser } from "./auth";
import { countOtherHolders, listLinks, removeLinks } from "./links";
import { getTicketsForUser, type PretixStore } from "./pretix";

/**
 * Everything the account may see: attached tickets first, then email-matched
 * ones, with attachments Pretix no longer verifies pruned on the way (the
 * client shows a one-line notice from `removedAttachments`).
 */
export async function ticketsPayload(
  user: AuthedUser,
  store: PretixStore
): Promise<TicketsPayload> {
  // Links are best effort: a Supabase hiccup must not take the email-matched
  // tickets down with it. Attach itself still reports its errors.
  let links: Awaited<ReturnType<typeof listLinks>> = [];
  try {
    links = await listLinks(user.id, store.eventSlug);
  } catch (err) {
    console.warn("[/api/tickets] ticket links unavailable, email-matched only:", err);
  }
  const { orders, deadLinks } = await getTicketsForUser(
    { email: user.email, links },
    store
  );
  if (deadLinks.length > 0) {
    try {
      await removeLinks(user.id, store.eventSlug, deadLinks);
    } catch (err) {
      console.warn("[/api/tickets] could not remove dead ticket links:", err);
    }
  }
  // Flag tickets another account also attached (best effort, informational).
  try {
    const positionIds = orders
      .flatMap((order) => order.tickets.map((ticket) => ticket.positionId))
      .filter((id): id is number => typeof id === "number");
    const shared = await countOtherHolders(user.id, store.eventSlug, positionIds);
    if (shared.size > 0) {
      for (const order of orders) {
        for (const ticket of order.tickets) {
          const others = ticket.positionId !== undefined ? shared.get(ticket.positionId) : undefined;
          if (others) ticket.sharedWith = others;
        }
      }
    }
  } catch (err) {
    console.warn("[/api/tickets] could not count other holders:", err);
  }
  return { tickets: orders, removedAttachments: deadLinks.length || undefined };
}
