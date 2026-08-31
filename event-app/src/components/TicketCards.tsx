"use client";

import { AnimatePresence, motion } from "framer-motion";
import cn from "classnames";
import { X } from "lucide-react";
import type { Ticket } from "@/data/tickets/types";
import { TicketProofButton } from "./TicketProofButton";

// Display hint only, mirroring the server-side tier heuristic (the ticketing
// team flags India-priced products with the emoji): India tickets' perk
// button leads with the free .eth name. The real tier decision stays in
// api/ticket-proof at mint time.
const INDIA_FLAG = /\u{1F1EE}\u{1F1F3}/u;

export type QrTarget = { qr: string; title: string };

/** One order's ticket + swag add-ons as a bordered card with QR thumbnails. */
export function TicketCard({
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
    <div className="divide-y divide-dc-hairline overflow-hidden rounded-2xl border border-dc-hairline shadow-sm">
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
          <p className="text-sm text-dc-muted truncate">{ticket.attendeeName}</p>
        )}
        {ticket.hasCheckedIn && (
          <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Checked in
          </span>
        )}
        {/* Event tickets only — the perk is one per event ticket, so the swag
            rows below deliberately don't get a proof link. */}
        <TicketProofButton
          ticketSecret={ticket.secret}
          freeName={INDIA_FLAG.test(ticket.itemName)}
        />
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
          <p className="text-[11px] uppercase tracking-wide text-dc-purple/70">
            {eyebrow}
          </p>
        )}
        <p className="text-lg font-bold leading-tight truncate">{title}</p>
        {email && (
          <p className="mt-0.5 truncate text-xs text-dc-muted">{email}</p>
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

/** QR lightbox — enlarged for easy scanning. */
export function QrLightbox({
  target,
  onClose,
}: {
  target: QrTarget | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {target && (
        <motion.div
          onClick={onClose}
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
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 cursor-pointer rounded-full p-1 text-dc-muted hover:bg-dc-lavender hover:text-dc-fg2"
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={target.qr}
              alt={`${target.title} QR code`}
              className="h-64 w-64 sm:h-72 sm:w-72"
            />
            <p className="font-semibold">{target.title}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
