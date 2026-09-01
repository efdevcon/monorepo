"use client";

import type { Ticket } from "@/data/tickets/types";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";
import { DC8Glyph } from "./DC8Glyph";
import type { QrModalTarget } from "./QrModals";
import {
  TICKET_THEMES,
  displayItemName,
  resolveTicketStyle,
  ticketBottomBackground,
  ticketTopBackground,
} from "./ticketTheme";

/**
 * The event admission ticket card (Figma Dev Handoff 5088-1500/-2386/-1761,
 * notch treatment from 5088-2908). Two gradient halves joined by a dashed
 * tear line with punched notches (`.ticket-notch-*` masks in globals.css);
 * the shadow is a drop-shadow on the wrapper so it follows the cutouts.
 */
export function EventTicketCard({
  ticket,
  qr,
  onQrClick,
}: {
  ticket: Ticket;
  qr?: string;
  onQrClick: (target: QrModalTarget) => void;
}) {
  const { attempt: logoAttempt, markFailed: markLogoFailed } =
    useRetryOnReconnect();
  const style = resolveTicketStyle(ticket);
  const theme = TICKET_THEMES[style];
  const typeName = displayItemName(ticket.itemName);
  const holder = ticket.attendeeName || ticket.attendeeEmail;
  // Event branding is fixed copy, like the venue block below (the Pretix
  // event name env var is lowercase "devcon" in prod).
  const modalTitle = `Devcon 8 India - ${typeName}`;

  return (
    // Strokes are before:-pseudo overlays rather than borders so they behave
    // like Figma's inside strokes: no layout impact (padding measures from the
    // card edge) and the notch masks cut through them. `outline` can't express
    // the mixed solid-sides + dashed-tear-line combination per half.
    <div>
      {/* Top half — product + holder + glyph art, dashed tear line below */}
      <div
        className="ticket-notch-top relative flex flex-col gap-10 overflow-clip rounded-t-[12px] p-4 before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-t-[12px] before:border before:border-dc-hairline before:content-[''] before:[border-bottom:1px_dashed_rgba(34,17,68,0.2)]"
        style={{ background: ticketTopBackground(theme) }}
      >
        <div className="flex flex-col gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={logoAttempt}
            src="/schedule/devcon8-logo.svg"
            onError={markLogoFailed}
            alt=""
            className="h-8 w-auto self-start"
          />
          {/* Product type leads; the holder (name, else email) sits below in
              the theme color (Figma revision 2026-09-01). */}
          <div className="flex flex-col gap-2">
            <p className="max-w-[234px] text-[24px] font-medium leading-[1.1] tracking-[-0.25px] text-dc-fg2 [word-break:break-word]">
              {typeName}
            </p>
            <p
              className="max-w-[234px] text-[12px] font-medium leading-none [word-break:break-word]"
              style={{ color: theme.label }}
            >
              {holder}
            </p>
          </div>
        </div>
        <p className="text-[10px] font-bold leading-none text-dc-muted">
          DEVCON.ORG
        </p>
        <DC8Glyph
          style={style}
          className="pointer-events-none absolute right-[-70px] top-[calc(50%+0.5px)] h-[309px] w-[181px] -translate-y-1/2"
        />
      </div>

      {/* Bottom half — QR + venue block */}
      <div
        className="ticket-notch-bottom relative rounded-b-[12px] p-4 before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-b-[12px] before:border before:border-t-0 before:border-dc-hairline before:content-['']"
        style={{ background: ticketBottomBackground(theme) }}
      >
        <div className="flex items-start gap-6">
          <button
            onClick={qr ? () => onQrClick({ kind: "ticket", qr, title: modalTitle, style }) : undefined}
            disabled={!qr}
            aria-label={`Enlarge ${typeName} QR code`}
            className="shrink-0 cursor-pointer rounded-[8px] p-[2px] transition-[scale] duration-150 ease-out disabled:cursor-default motion-safe:enabled:hover:scale-[1.03] motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none"
            style={{ background: theme.accent }}
          >
            <span className="block rounded-[6px] bg-white p-[2px]">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt={`${typeName} QR code`}
                  className="size-[98px] rounded-[4px]"
                />
              ) : (
                <span className="block size-[98px] rounded-[4px]" />
              )}
            </span>
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-end justify-between gap-3 self-stretch py-1 text-right text-dc-muted">
            <div className="flex flex-col items-end gap-0.5">
              <p className="text-[12px] font-bold leading-[1.15]">
                MUMBAI, INDIA
              </p>
              <p className="text-[12.5px] leading-[1.15]">3—6 Nov, 2026</p>
            </div>
            <div className="flex w-full flex-col gap-0.5 text-[9px] leading-[1.25]">
              <p className="font-semibold">Jio World Centre</p>
              <p>
                G Block, Bandra Kurla Complex (BKC)
                <br />
                Bandra East, Mumbai
                <br />
                Maharashtra 400098, India
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
