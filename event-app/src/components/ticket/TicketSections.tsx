"use client";

import { useState } from "react";
import cn from "classnames";
import { RefreshCw } from "lucide-react";
import type { Order, Ticket } from "@/data/tickets/types";
import { EventTicketCard } from "./EventTicketCard";
import { EnsPerkCard } from "./EnsPerkCard";
import { SwagCard } from "./SwagCard";
import { QrModal, type QrModalTarget } from "./QrModals";

/** Section headings match the home page's (FeaturedCard.tsx etc.). */
const SECTION_TITLE =
  "text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2";

/**
 * The signed-in ticket layout (Figma "My Devcon", 5088-116/-1059), shared by
 * the ticket page and the home page: My Event Ticket column, My Swag shelf,
 * My Perks row, and the QR modal. Callers keep their own loading/empty/error
 * states; this renders data.
 */
export function TicketSections({
  tickets,
  qrCodes,
  onRefresh,
  isRefreshing = false,
  refreshDisabled = false,
}: {
  tickets: Order[];
  qrCodes: Record<string, string>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshDisabled?: boolean;
}) {
  const [modal, setModal] = useState<QrModalTarget | null>(null);

  const admissionTickets: Ticket[] = [];
  const swagItems: Array<{ secret: string; title: string; imageUrl?: string }> =
    [];
  for (const order of tickets) {
    for (const ticket of order.tickets) {
      // `admission === false` is a Pretix item explicitly marked as
      // merchandise; undefined (older cached data) still counts as a ticket.
      if (ticket.admission === false) {
        swagItems.push({
          secret: ticket.secret,
          title: ticket.itemName,
          imageUrl: ticket.imageUrl,
        });
      } else {
        admissionTickets.push(ticket);
      }
      for (const addon of ticket.addons ?? []) {
        swagItems.push({
          secret: addon.secret,
          title: addon.itemName,
          imageUrl: addon.imageUrl,
        });
      }
    }
  }

  // With several tickets, both tickets and swag become full-width horizontal
  // carousels stacked vertically; with one, the ticket sits beside the swag
  // shelf in the Figma two-column layout.
  const multiTicket = admissionTickets.length > 1;

  const ticketHeader = (
    <div className="flex h-8 items-center justify-between">
      <h2 className={SECTION_TITLE}>
        {multiTicket ? "My Event Tickets" : "My Event Ticket"}
      </h2>
      {/* Not in the design; kept deliberately (see git history). */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshDisabled}
          aria-label="Refresh tickets"
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dc-hairline bg-white transition-colors duration-150 ease-out hover:bg-dc-lavender disabled:cursor-default disabled:opacity-50"
        >
          <RefreshCw
            className={cn("size-4 text-dc-fg2", isRefreshing && "animate-spin")}
          />
        </button>
      )}
    </div>
  );

  // Shared desktop-carousel treatment: matching negative margin/inset +
  // padding gives hovered cards scale headroom before the overflow clip
  // without moving the resting layout (each shelf sets its own amount), and
  // the right edge fade (Figma 5088-1181, 36px) is a mask on the scroller —
  // not a white overlay — so it works on the home page's tinted background
  // as well as the ticket page's white panel (DayTabs pattern).
  const scrollerBase =
    "flex flex-col gap-4 lg:flex-row lg:overflow-x-auto lg:[mask-image:linear-gradient(to_right,#000_calc(100%-36px),transparent)] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden";
  const endSpacer = (
    // Spacer so the last card can scroll clear of the 36px fade.
    <div aria-hidden className="hidden w-9 shrink-0 lg:block" />
  );

  const swagSection = swagItems.length > 0 && (
    <section
      className={cn(
        "flex w-full flex-col gap-4",
        !multiTicket && "lg:min-w-0 lg:flex-1"
      )}
    >
      <div className="flex h-8 items-center">
        <h2 className={SECTION_TITLE}>My Swag</h2>
      </div>
      {/* The shelf absolutely fills the wrapper so the swag images can never
          inflate the row: beside a single ticket the ticket column sets the
          height, in the stacked multi-ticket layout the wrapper is fixed at
          the design's 319px. */}
      <div
        className={cn(
          "relative",
          multiTicket ? "lg:h-[319px]" : "lg:min-h-0 lg:flex-1"
        )}
      >
        <div className={cn(scrollerBase, "lg:absolute lg:-inset-3 lg:p-3")}>
          {swagItems.map((item) => (
            <SwagCard
              key={item.secret}
              title={item.title}
              imageUrl={item.imageUrl}
              qr={qrCodes[item.secret]}
              onQrClick={setModal}
              shelfOnDesktop
            />
          ))}
          {endSpacer}
        </div>
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-6 text-left">
      {multiTicket ? (
        <>
          <section className="flex w-full flex-col gap-4">
            {ticketHeader}
            {/* Ticket carousel: heights are content-driven, so -m/p cancel
                out instead of the absolute-fill trick. 20px headroom (vs the
                swag shelf's 12px) because these cards also cast a hover
                shadow beyond the 1.03 scale. Each wrapper is a flex box so
                the stretched cards equalize to the tallest. */}
            <div className={cn(scrollerBase, "lg:-m-5 lg:p-5")}>
              {admissionTickets.map((ticket) => (
                <div
                  key={ticket.secret}
                  className="w-full lg:flex lg:w-[400px] lg:shrink-0"
                >
                  <EventTicketCard
                    ticket={ticket}
                    qr={qrCodes[ticket.secret]}
                    onQrClick={setModal}
                  />
                </div>
              ))}
              {endSpacer}
            </div>
          </section>
          {swagSection}
        </>
      ) : (
        /* Default stretch alignment keeps the two columns — and via h-full on
           the shelf cards, the cards themselves — the same height. */
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <section className="flex w-full flex-col gap-4 lg:w-[400px] lg:shrink-0">
            {ticketHeader}
            {admissionTickets.map((ticket) => (
              <EventTicketCard
                key={ticket.secret}
                ticket={ticket}
                qr={qrCodes[ticket.secret]}
                onQrClick={setModal}
              />
            ))}
          </section>
          {swagSection}
        </div>
      )}

      {/* One ENS perk per event ticket (see TicketProofButton). */}
      {admissionTickets.length > 0 && (
        <section className="flex w-full flex-col gap-4">
          <div className="flex h-8 items-center">
            <h2 className={SECTION_TITLE}>My Perks</h2>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap">
            {admissionTickets.map((ticket) => (
              <EnsPerkCard
                key={ticket.secret}
                ticket={ticket}
                showTicketLabel={admissionTickets.length > 1}
              />
            ))}
          </div>
        </section>
      )}

      <QrModal target={modal} onClose={() => setModal(null)} />
    </div>
  );
}
