"use client";

import { useState } from "react";
import cn from "classnames";
import { RefreshCw } from "lucide-react";
import { useTickets } from "@/data/tickets/useTickets";
import { useUser } from "@/data/auth/useUser";
import { Link } from "@/routing";
import { QrLightbox, TicketCard, type QrTarget } from "./TicketCards";

/** Renders the user's tickets as cards with QR codes (prompts to get a ticket
 *  when there are none, including when logged out). */
export function Tickets() {
  const { user } = useUser();
  const { tickets, qrCodes, isLoading, isRefreshing, error, refresh } =
    useTickets();
  const [lightbox, setLightbox] = useState<QrTarget | null>(null);

  const allTickets = tickets.flatMap((order) =>
    order.tickets.map((ticket) => ({ ticket, eventName: order.eventName }))
  );

  return (
    <section className="w-full text-left">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Your tickets</h2>
        {user && (
          <button
            onClick={refresh}
            disabled={isLoading || isRefreshing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E1E4EA] bg-white px-3 py-1.5 text-sm font-medium text-[#7D52F4] shadow-sm transition-colors hover:bg-[#f3eeff] disabled:cursor-default disabled:opacity-50"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
            />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading tickets…</p>
      ) : error ? (
        <p className="text-sm text-red-500">
          Couldn&apos;t load tickets: {error.message}
        </p>
      ) : allTickets.length === 0 ? (
        <>
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
              <h3 className="text-lg font-bold">
                {user ? "Welcome!" : "Join Devcon"}
              </h3>
              <p className="mt-1 max-w-xs text-sm text-white/80">
                {user
                  ? "We couldn't find any tickets for your email yet."
                  : "Grab your ticket to unlock the full experience."}
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

          {!user && (
            <p className="mt-3 text-sm text-gray-400">
              Already have a ticket?{" "}
              <Link href="/ticket" className="text-[#7D52F4] hover:underline">
                Sign in
              </Link>{" "}
              with the email that has a ticket associated with it.
            </p>
          )}
        </>
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
