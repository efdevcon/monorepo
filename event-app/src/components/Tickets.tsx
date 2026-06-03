"use client";

import { useTickets } from "@/data/tickets/useTickets";
import type { Ticket } from "@/data/tickets/types";

/** Renders the signed-in user's tickets as cards with QR codes. */
export function Tickets() {
  const { tickets, qrCodes, isLoading, error, refresh } = useTickets();

  const allTickets = tickets.flatMap((order) =>
    order.tickets.map((ticket) => ({ ticket, eventName: order.eventName }))
  );

  return (
    <section className="w-full text-left">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Your tickets</h2>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="text-sm text-[#7D52F4] hover:underline disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {isLoading && allTickets.length === 0 ? (
        <p className="text-gray-500 text-sm">Loading tickets…</p>
      ) : error ? (
        <p className="text-sm text-red-500">
          Couldn&apos;t load tickets: {error.message}
        </p>
      ) : allTickets.length === 0 ? (
        <p className="text-gray-500 text-sm">No tickets found for your email.</p>
      ) : (
        <div className="space-y-3">
          {allTickets.map(({ ticket, eventName }) => (
            <TicketCard
              key={ticket.secret}
              ticket={ticket}
              eventName={eventName}
              qr={qrCodes[ticket.secret]}
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
  qr,
}: {
  ticket: Ticket;
  eventName?: string;
  qr?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#E1E4EA] p-4">
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
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr}
          alt="Ticket QR code"
          className="h-20 w-20 shrink-0 rounded-md"
        />
      )}
    </div>
  );
}
