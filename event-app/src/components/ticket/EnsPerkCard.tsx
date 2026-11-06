"use client";

import type { Ticket } from "@/data/tickets/types";
import { TicketProofButton } from "@/components/TicketProofButton";
import { displayItemName } from "./ticketTheme";

/**
 * "Perks" entry for the ENS attendee perk. Card chrome only — the mint +
 * hand-off flow stays in TicketProofButton (one proof per event ticket, so
 * the section renders one card per admission ticket). Who gets one is
 * `ensPerkAccess` (data/tickets/ensPerk.ts): any ticket once checked in.
 */
export function EnsPerkCard({
  ticket,
  showTicketLabel = false,
}: {
  ticket: Ticket;
  /** Distinguish cards when the user holds several admission tickets. */
  showTicketLabel?: boolean;
}) {
  const holder = ticket.attendeeName || ticket.attendeeEmail;

  return (
    <div className="flex items-start gap-4 rounded-[12px] bg-white p-4 outline outline-dc-hairline lg:w-[400px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/partners/ens.png" alt="ENS" className="size-10 shrink-0" />
      <div className="min-w-0">
        <p className="text-[16px] font-bold leading-6 text-dc-fg2">ENS</p>
        {showTicketLabel && (
          <p className="truncate text-[12px] leading-4 text-dc-muted">
            {displayItemName(ticket.itemName)} · {holder}
          </p>
        )}
        <p className="mt-1 text-[14px] leading-5 text-dc-muted">
          Free .eth name for every Devcon attendee, while they last.
        </p>
        <TicketProofButton ticketSecret={ticket.secret} />
      </div>
    </div>
  );
}
