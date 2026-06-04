"use client";

import { useTickets } from "@/data/tickets/useTickets";
import { useUser } from "@/data/auth/useUser";
import { Link } from "@/routing";
import type { Ticket } from "@/data/tickets/types";

/** Renders the user's tickets as cards with QR codes (prompts to get a ticket
 *  when there are none, including when logged out). */
export function Tickets() {
  const { user } = useUser();
  const { tickets, qrCodes, isLoading, isRefreshing, error, refresh } =
    useTickets();

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
            className="text-sm text-[#7D52F4] hover:underline disabled:opacity-50"
          >
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
              <Link href="/login" className="text-[#7D52F4] hover:underline">
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
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TicketCard({
  ticket,
  eventName,
  qrCodes,
}: {
  ticket: Ticket;
  eventName?: string;
  qrCodes: Record<string, string>;
}) {
  const addons = ticket.addons ?? [];

  return (
    <div className="rounded-xl border border-[#E1E4EA] p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          {eventName && (
            <p className="text-xs uppercase tracking-wide text-[#939393]">
              {eventName}
            </p>
          )}
          <p className="font-semibold truncate">{ticket.itemName}</p>
          {ticket.attendeeName && (
            <p className="text-sm text-gray-600 truncate">
              {ticket.attendeeName}
            </p>
          )}
          {ticket.hasCheckedIn && (
            <span className="inline-block mt-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Checked in
            </span>
          )}
        </div>
        {qrCodes[ticket.secret] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrCodes[ticket.secret]}
            alt="Ticket QR code"
            className="h-20 w-20 shrink-0 rounded-md"
          />
        )}
      </div>

      {/* Swag / add-ons, each with its own scannable QR code. */}
      {addons.length > 0 && (
        <div className="mt-4 border-t border-[#E1E4EA] pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#939393]">
            Swag
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {addons.map((addon) => (
              <div
                key={addon.secret}
                className="flex flex-col items-center gap-2 rounded-lg border border-[#E1E4EA] p-3"
              >
                {qrCodes[addon.secret] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodes[addon.secret]}
                    alt={`${addon.itemName} QR code`}
                    className="aspect-square w-full max-w-[120px] rounded"
                  />
                )}
                <span className="text-center text-xs font-medium">
                  {addon.itemName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
