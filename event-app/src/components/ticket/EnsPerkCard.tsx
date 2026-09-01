"use client";

import type { Ticket } from "@/data/tickets/types";
import { TicketProofButton } from "@/components/TicketProofButton";
import { displayItemName, resolveTicketStyle } from "./ticketTheme";

/**
 * "My Perks" entry for the ENS attendee perk. Card chrome only — the mint +
 * hand-off flow stays in TicketProofButton (one proof per event ticket, so
 * the section renders one card per admission ticket).
 */
export function EnsPerkCard({
  ticket,
  showTicketLabel = false,
}: {
  ticket: Ticket;
  /** Distinguish cards when the user holds several admission tickets. */
  showTicketLabel?: boolean;
}) {
  // Same display hint the old ticket-row button used: India-tier tickets lead
  // with the free .eth name (the proof route decides the real tier at mint).
  const freeName = resolveTicketStyle(ticket) === "india";
  const holder = ticket.attendeeName || ticket.attendeeEmail;

  return (
    <div className="flex items-start gap-4 rounded-[12px] bg-white p-4 outline -outline-offset-1 outline-dc-hairline lg:w-[400px]">
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
          {freeName
            ? "Claim a .eth name with the first year's registration covered — plus the frENS reward if you already hold a name with 10+ years remaining."
            : "Hold an ENS name with 10+ years remaining? Claim the limited-edition frENS reward."}
        </p>
        <TicketProofButton ticketSecret={ticket.secret} freeName={freeName} />
      </div>
    </div>
  );
}
