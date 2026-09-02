"use client";

import { useTickets } from "@/data/tickets/useTickets";
import {
  RefreshTicketsButton,
  TicketSectionHeader,
  TicketSections,
} from "./ticket/TicketSections";

/**
 * Signed-in body of the ticket page (Figma "My Devcon"): loading/error/empty
 * states around the shared TicketSections layout (also used on the home page).
 */
export function MyTickets() {
  const { tickets, qrCodes, isLoading, isRefreshing, error, refresh } =
    useTickets();

  if (!isLoading && tickets.length > 0) {
    return (
      <div className="w-full text-left">
        {/* A failed revalidation must never hide cached tickets/QR codes:
            keep the sections and add a quiet notice instead (same rule as the
            home page's Tickets.tsx). */}
        {error && (
          <p className="mb-2 text-xs text-dc-muted">
            Couldn&apos;t refresh tickets. Showing your saved ones.
          </p>
        )}
        <TicketSections
          tickets={tickets}
          qrCodes={qrCodes}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          refreshDisabled={isLoading || isRefreshing}
        />
      </div>
    );
  }

  // TicketSections renders its own headers (refresh control included). The
  // other states get the same header so refresh stays reachable: without it,
  // an order that just flipped to paid only shows up after a reload.
  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <TicketSectionHeader
        title="My Event Ticket"
        action={
          <RefreshTicketsButton
            onRefresh={refresh}
            isRefreshing={isRefreshing}
            disabled={isLoading || isRefreshing}
          />
        }
      />
      {isLoading ? (
        <p className="text-sm text-dc-muted">Loading tickets…</p>
      ) : error ? (
        <p className="text-sm text-dc-error">
          Couldn&apos;t load tickets: {error.message}
        </p>
      ) : (
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
      )}
    </div>
  );
}
