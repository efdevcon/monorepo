"use client";

import { ExternalLink } from "lucide-react";
import type { BuyerOrder } from "@/data/tickets/primary";

/**
 * Nudge for a buyer whose order still holds several tickets under their own
 * email: set each holder's email on their ticket in Pretix so the holders sign
 * in with it, find their ticket loaded, and never need to choose or upload.
 * One chip per ticket, labelled like the select rows ("Order KXQFQ · Ticket
 * #1"); Pretix has no per-ticket page on this instance, so each opens the
 * order page, where every ticket has its own "change details". Renders
 * nothing when there is no such order.
 */
export function BuyerOrdersHint({ orders }: { orders: BuyerOrder[] }) {
  if (orders.length === 0) return null;
  const severalOrders = orders.length > 1;
  return (
    <div className="flex flex-col gap-2 text-[12px] leading-4 text-dc-muted">
      <p>
        <span className="font-bold text-dc-fg2">Bought tickets for others? </span>
        Set each holder&apos;s email on their ticket in Pretix, so they can sign in with it and find
        their ticket already loaded.
      </p>
      <div className="flex flex-wrap gap-2">
        {orders.flatMap((order) =>
          order.tickets.map((ticket) => (
            <a
              key={ticket.secret}
              href={order.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full border border-dc-hairline bg-white px-2.5 text-[12px] font-semibold leading-none text-dc-purple transition-colors duration-150 ease-out hover:bg-dc-purple-wash"
            >
              {severalOrders ? `Order ${order.orderCode} · ` : ""}Ticket&nbsp;#{ticket.ordinal}
              <ExternalLink className="size-3" />
            </a>
          ))
        )}
      </div>
    </div>
  );
}
