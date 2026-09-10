"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTickets } from "@/data/tickets/useTickets";
import { useUser } from "@/data/auth/useUser";
import { buyerOrdersToAssign, ticketChoices } from "@/data/tickets/primary";
import { BuyerOrdersHint } from "./ticket/BuyerOrdersHint";
import { useOnline } from "@/hooks/useOnline";
import { AttachTicketCard, ChooseTicketCard } from "./ticket/AttachTicketCard";
import {
  RefreshTicketsButton,
  TicketSectionHeader,
  TicketSections,
} from "./ticket/TicketSections";

const purchaseLink = (
  <p className="text-sm text-dc-muted">
    Don&apos;t have a ticket yet?{" "}
    <a
      href="https://devcon.org/tickets"
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-dc-purple underline-offset-2 hover:underline"
    >
      Get tickets ↗
    </a>
  </p>
);

/**
 * Signed-in body of the ticket page (Figma "My Devcon"): loading/error/empty
 * states around the shared TicketSections layout (also used on the home page),
 * plus the two "which ticket is yours" prompts (spec: ticket identity design).
 * Several tickets under the email: a select, and no QR codes until one is
 * chosen. None: the screenshot upload instead of an empty state.
 */
export function MyTickets() {
  const { user } = useUser();
  const {
    tickets,
    qrCodes,
    primary,
    prompt,
    removedAttachments,
    attach,
    choose,
    detach,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useTickets();
  const online = useOnline();
  const [replacing, setReplacing] = useState(false);
  const buyerOrders = buyerOrdersToAssign(tickets);

  const attachAndClose = async (code: string) => {
    const result = await attach(code);
    if (result.ok) setReplacing(false);
    return result;
  };
  const handleDetach = async (positionId: number) => {
    const result = await detach(positionId);
    if (result.ok) toast.success("Ticket removed from this account");
    else toast.error(result.error);
  };

  const refreshButton = (
    <RefreshTicketsButton
      onRefresh={refresh}
      isRefreshing={isRefreshing}
      disabled={isLoading || isRefreshing || !online}
    />
  );
  const connectionNotice = (error || !online) && (
    <p className="text-xs text-dc-muted">
      {online
        ? "Couldn't refresh tickets. Showing your saved ones."
        : "You're offline. Showing your saved tickets."}
    </p>
  );
  const removedNotice = removedAttachments > 0 && (
    <p className="text-xs text-dc-muted">
      A ticket on this account is no longer yours in Pretix and was removed here.
      {prompt !== null && " Pick or upload your ticket again."}
    </p>
  );
  // Choosing needs the server; offline, the saved tickets and their QR codes
  // stay reachable (the door does not wait) with a reminder to pick later.
  const chooseLater = prompt === "choose" && !online && (
    <p className="text-xs text-dc-muted">
      Pick which ticket is yours when you&apos;re back online.
    </p>
  );

  // Several tickets, none chosen: ask, and show no QR codes yet.
  if (!isLoading && prompt === "choose" && online) {
    return (
      <div className="flex w-full flex-col gap-4 text-left">
        <TicketSectionHeader title="My Event Ticket" action={refreshButton} />
        {connectionNotice}
        {removedNotice}
        <ChooseTicketCard
          choices={ticketChoices(tickets)}
          accountEmail={user?.email ?? ""}
          buyerOrders={buyerOrders}
          onChoose={choose}
          onAttach={attach}
        />
      </div>
    );
  }

  if (!isLoading && tickets.length > 0) {
    return (
      <div className="flex w-full flex-col gap-6 text-left">
        {/* A failed revalidation must never hide cached tickets/QR codes:
            keep the sections and add a quiet notice instead (same rule as the
            home page's Tickets.tsx). Offline, say so plainly. */}
        {connectionNotice}
        {removedNotice}
        {chooseLater}
        {prompt === "none" && <AttachTicketCard variant="none" onAttach={attachAndClose} />}
        <TicketSections
          tickets={tickets}
          qrCodes={qrCodes}
          primary={primary}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          refreshDisabled={isLoading || isRefreshing || !online}
          onReplace={() => setReplacing(true)}
          onDetach={handleDetach}
          leadSlot={
            replacing && (
              <AttachTicketCard
                variant="replace"
                onAttach={attachAndClose}
                onCancel={() => setReplacing(false)}
              />
            )
          }
        />
        {/* A buyer with several tickets still under their email sees this
            whenever they land here, chosen ticket or not: the same block as
            inside the select, in the same card frame. */}
        {buyerOrders.length > 0 && (
          <section className="flex flex-col gap-3 rounded-xl border border-dc-hairline bg-white p-4">
            <BuyerOrdersHint orders={buyerOrders} />
          </section>
        )}
      </div>
    );
  }

  // TicketSections renders its own headers (refresh control included). The
  // other states get the same header so refresh stays reachable: without it,
  // an order that just flipped to paid only shows up after a reload.
  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <TicketSectionHeader title="My Event Ticket" action={refreshButton} />
      {isLoading ? (
        <p className="text-sm text-dc-muted">Loading tickets…</p>
      ) : error ? (
        <p className="text-sm text-dc-error">
          Couldn&apos;t load tickets: {error.message}
        </p>
      ) : (
        <>
          {/* No ticket under this email: instead of an empty state, the way
              forward (spec). */}
          {removedNotice}
          <AttachTicketCard variant="none" onAttach={attachAndClose} />
          {purchaseLink}
        </>
      )}
    </div>
  );
}
