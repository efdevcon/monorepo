"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import cn from "classnames";
import { RefreshCw, X } from "lucide-react";
import { useTickets } from "@/data/tickets/useTickets";
import { useUser } from "@/data/auth/useUser";
import { Link } from "@/routing";
import type { Ticket } from "@/data/tickets/types";

type QrTarget = { qr: string; title: string };

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
              onQrClick={setLightbox}
            />
          ))}
        </div>
      )}

      {/* QR lightbox — enlarged for easy scanning */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="relative flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <button
                onClick={() => setLightbox(null)}
                aria-label="Close"
                className="absolute right-3 top-3 cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.qr}
                alt={`${lightbox.title} QR code`}
                className="h-64 w-64 sm:h-72 sm:w-72"
              />
              <p className="font-semibold">{lightbox.title}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TicketCard({
  ticket,
  eventName,
  qrCodes,
  onQrClick,
}: {
  ticket: Ticket;
  eventName?: string;
  qrCodes: Record<string, string>;
  onQrClick: (target: QrTarget) => void;
}) {
  const addons = ticket.addons ?? [];

  return (
    <div className="divide-y divide-[#E1E4EA] overflow-hidden rounded-2xl border border-[#E1E4EA] shadow-sm">
      {/* Main ticket row (gradient) */}
      <TicketRow
        eyebrow={eventName}
        title={ticket.itemName}
        email={ticket.attendeeEmail}
        qr={qrCodes[ticket.secret]}
        onQrClick={onQrClick}
        className="bg-gradient-to-br from-[#ece4ff] via-white to-[#fbf0ff]"
      >
        {ticket.attendeeName && (
          <p className="text-sm text-gray-600 truncate">{ticket.attendeeName}</p>
        )}
        {ticket.hasCheckedIn && (
          <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Checked in
          </span>
        )}
      </TicketRow>

      {/* Swag / add-ons — same row styling, no gradient. Same ticket email. */}
      {addons.map((addon) => (
        <TicketRow
          key={addon.secret}
          eyebrow="Swag"
          title={addon.itemName}
          email={ticket.attendeeEmail}
          qr={qrCodes[addon.secret]}
          onQrClick={onQrClick}
        />
      ))}
    </div>
  );
}

function TicketRow({
  eyebrow,
  title,
  email,
  qr,
  onQrClick,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  email?: string;
  qr?: string;
  onQrClick: (target: QrTarget) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-4",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-wide text-[#7D52F4]/70">
            {eyebrow}
          </p>
        )}
        <p className="text-lg font-bold leading-tight truncate">{title}</p>
        {email && (
          <p className="mt-0.5 truncate text-xs text-gray-500">{email}</p>
        )}
        {children}
      </div>
      {qr && (
        <button
          onClick={() => onQrClick({ qr, title })}
          aria-label={`Enlarge ${title} QR code`}
          className="shrink-0 cursor-pointer rounded-xl bg-white p-2 shadow-sm transition-transform hover:scale-105"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`${title} QR code`} className="h-14 w-14" />
        </button>
      )}
    </div>
  );
}
