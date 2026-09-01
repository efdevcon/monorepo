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

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Default stretch alignment keeps the two columns — and via h-full on
          the shelf cards, the cards themselves — the same height. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <section className="flex w-full flex-col gap-4 lg:w-[400px] lg:shrink-0">
          {/* h-8 fits the 28.8px title line and the refresh circle, mirrored
              on the swag header so both columns' cards start at the same y. */}
          <div className="flex h-8 items-center justify-between">
            <h2 className={SECTION_TITLE}>
              {admissionTickets.length > 1
                ? "My Event Tickets"
                : "My Event Ticket"}
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
                  className={cn(
                    "size-4 text-dc-fg2",
                    isRefreshing && "animate-spin"
                  )}
                />
              </button>
            )}
          </div>
          {admissionTickets.map((ticket) => (
            <EventTicketCard
              key={ticket.secret}
              ticket={ticket}
              qr={qrCodes[ticket.secret]}
              onQrClick={setModal}
            />
          ))}
        </section>

        {swagItems.length > 0 && (
          <section className="flex w-full flex-col gap-4 lg:min-w-0 lg:flex-1">
            <div className="flex h-8 items-center">
              <h2 className={SECTION_TITLE}>My Swag</h2>
            </div>
            {/* The shelf absolutely fills the flex-1 wrapper so the swag
                images can never inflate the row — the ticket column alone
                sets the height, and the cards stretch to match it. */}
            <div className="relative lg:min-h-0 lg:flex-1">
              {/* -inset-3 + p-3 keeps the resting layout identical while
                  giving hovered cards 12px of scale headroom before the
                  scroller's overflow clip. */}
              <div className="flex flex-col gap-4 lg:absolute lg:-inset-3 lg:flex-row lg:overflow-x-auto lg:p-3 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
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
                {/* Spacer so the last card can scroll clear of the 36px fade. */}
                <div aria-hidden className="hidden w-9 shrink-0 lg:block" />
              </div>
              {/* Desktop shelf fade (Figma 5088-1181, 36px white ramp).
                  -right-3 tracks the scroller's -inset-3 overhang so no
                  unfaded strip peeks out past it. */}
              <div className="pointer-events-none absolute inset-y-0 -right-3 hidden w-9 bg-gradient-to-r from-white/0 to-white lg:block" />
            </div>
          </section>
        )}
      </div>

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
