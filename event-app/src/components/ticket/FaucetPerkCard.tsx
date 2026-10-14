"use client";

import type { Ticket } from "@/data/tickets/types";
import { Droplets } from "lucide-react";
import {
  TicketProofButton,
  type ProofPartner,
} from "@/components/TicketProofButton";
import { displayItemName } from "./ticketTheme";

/** One faucet per network, each its own key in the proof route's `PARTNERS`. */
function faucet(key: string, network: string): ProofPartner {
  return {
    key,
    label: `Claim ${network} ETH`,
    describe: () =>
      `Your ticket unlocks a ${network} testnet ETH drop for your wallet.`,
    handoffHint: "You'll enter the wallet address that should receive the drop.",
  };
}

const FAUCETS = [
  faucet("powfaucet-sepolia", "Sepolia"),
  faucet("powfaucet-hoodi", "Hoodi"),
];

/**
 * "Perks" entry for the testnet faucet: the PoW faucet hands Devcon ticket
 * holders Sepolia and Hoodi testnet ETH. Card chrome only — the
 * mint + hand-off flow stays in TicketProofButton, one proof per event ticket,
 * exactly like the ENS card next to it.
 */
export function FaucetPerkCard({
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
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-dc-lavender text-dc-purple">
        <Droplets className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[16px] font-bold leading-6 text-dc-fg2">
          Testnet Faucet
        </p>
        {showTicketLabel && (
          <p className="truncate text-[12px] leading-4 text-dc-muted">
            {displayItemName(ticket.itemName)} · {holder}
          </p>
        )}
        <p className="mt-1 text-[14px] leading-5 text-dc-muted">
          Sepolia and Hoodi testnet ETH for Devcon attendees.
        </p>
        {/* Each network's proof lands on that network's faucet directly, no
            chooser in between. */}
        <div className="flex flex-wrap gap-x-4">
          {FAUCETS.map((partner) => (
            <TicketProofButton
              key={partner.key}
              ticketSecret={ticket.secret}
              partner={partner}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
