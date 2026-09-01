"use client";

import { useState } from "react";
import cn from "classnames";
import { RefreshCw } from "lucide-react";
import { useTickets } from "@/data/tickets/useTickets";
import type { Ticket } from "@/data/tickets/types";
import { EventTicketCard } from "./ticket/EventTicketCard";
import { SwagCard } from "./ticket/SwagCard";
import { QrModal, type QrModalTarget } from "./ticket/QrModals";

/**
 * Signed-in body of the ticket page (Figma "My Devcon", Dev Handoff 5088-116
 * mobile / 5088-1059 desktop): "My Event Ticket" cards plus a "My Swag"
 * section collecting every add-on AND standalone non-admission position (some
 * swag is sold as its own position — previously those wrongly rendered as
 * admission cards). Mobile stacks both sections; desktop puts the ticket
 * column beside a horizontally scrolling swag shelf with a right edge fade.
 */
export function MyTickets() {
  const { tickets, qrCodes, isLoading, isRefreshing, error, refresh } =
    useTickets();
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
    <div className="w-full text-left">
      {isLoading ? (
        <p className="text-sm text-dc-muted">Loading tickets…</p>
      ) : error ? (
        <p className="text-sm text-dc-error">
          Couldn&apos;t load tickets: {error.message}
        </p>
      ) : admissionTickets.length === 0 && swagItems.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl p-6 text-white">
          {/* Real banner art from devcon.org/tickets + gradient for legibility */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tickets-hero.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1b0a45]/90 via-[#1b0a45]/60 to-transparent" />
          <div className="relative min-w-0">
            <h3 className="text-lg font-bold">Welcome!</h3>
            <p className="mt-1 max-w-xs text-sm text-white/80">
              We couldn&apos;t find any tickets for your email yet.
            </p>
            <a
              href="https://devcon.org/tickets"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#3D00BF] transition-colors hover:bg-white/90"
            >
              Get tickets
            </a>
          </div>
        </div>
      ) : (
        // Default stretch alignment keeps the two columns — and via h-full on
        // the shelf cards, the cards themselves — the same height.
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <section className="flex w-full flex-col gap-4 lg:w-[400px] lg:shrink-0">
            {/* h-7 = the refresh circle's height, mirrored on the swag header
                so both columns' cards start at the same y. */}
            <div className="flex h-7 items-center justify-between">
              <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">
                {admissionTickets.length > 1
                  ? "My Event Tickets"
                  : "My Event Ticket"}
              </h2>
              {/* Not in the design; kept deliberately (see git history). */}
              <button
                onClick={refresh}
                disabled={isLoading || isRefreshing}
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
              <div className="flex h-7 items-center">
                <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">
                  My Swag
                </h2>
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
      )}

      <QrModal target={modal} onClose={() => setModal(null)} />
    </div>
  );
}
