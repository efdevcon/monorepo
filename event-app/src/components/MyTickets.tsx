"use client";

import { useState } from "react";
import cn from "classnames";
import { RefreshCw } from "lucide-react";
import { useTickets } from "@/data/tickets/useTickets";
import { QrLightbox, TicketCard, type QrTarget } from "./TicketCards";

/**
 * "My tickets" section of the signed-in ticket page (Figma "My Devcon").
 * Forked from the home-page `Tickets` list: same cards and QR lightbox, but
 * with the design's section header (the refresh control — not in the design,
 * kept deliberately — shrinks to an icon button).
 */
export function MyTickets() {
  const { tickets, qrCodes, isLoading, isRefreshing, error, refresh } =
    useTickets();
  const [lightbox, setLightbox] = useState<QrTarget | null>(null);

  const allTickets = tickets.flatMap((order) =>
    order.tickets.map((ticket) => ({ ticket, eventName: order.eventName }))
  );

  return (
    <section className="flex w-full flex-col gap-4 text-left lg:max-w-[709px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold leading-6 text-dc-fg2">
          My tickets
        </h2>
        <button
          onClick={refresh}
          disabled={isLoading || isRefreshing}
          aria-label="Refresh tickets"
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dc-hairline bg-white transition-colors duration-150 ease-out hover:bg-dc-lavender disabled:cursor-default disabled:opacity-50"
        >
          <RefreshCw
            className={cn("size-4 text-dc-fg2", isRefreshing && "animate-spin")}
          />
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-dc-muted">Loading tickets…</p>
      ) : error ? (
        <p className="text-sm text-dc-error">
          Couldn&apos;t load tickets: {error.message}
        </p>
      ) : allTickets.length === 0 ? (
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
        <div className="space-y-3">
          {allTickets.map(({ ticket, eventName }) => (
            <TicketCard
              key={ticket.secret}
              ticket={ticket}
              eventName={eventName}
              qrCodes={qrCodes}
              onQrClick={setLightbox}
            />
          ))}
        </div>
      )}

      <QrLightbox target={lightbox} onClose={() => setLightbox(null)} />
    </section>
  );
}
