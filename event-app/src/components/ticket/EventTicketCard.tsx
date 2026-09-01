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
    <div className="[filter:drop-shadow(0_1px_3px_rgba(22,11,43,0.1))_drop-shadow(0_1px_2px_rgba(22,11,43,0.1))]">
      {/* Top half — holder identity + glyph art, dashed tear line below */}
      <div
        className="ticket-notch-top relative flex flex-col gap-10 overflow-clip rounded-t-[12px] border border-dc-hairline p-4 [border-bottom:1px_dashed_rgba(34,17,68,0.2)]"
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
          <div className="flex flex-col gap-2">
            <p className="max-w-[234px] text-[24px] font-medium leading-[1.1] tracking-[-0.25px] text-dc-fg2 [word-break:break-word]">
              {holder}
            </p>
            <p
              className="text-[12px] font-medium leading-none"
              style={{ color: theme.label }}
            >
              {typeName}
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
        className="ticket-notch-bottom rounded-b-[12px] border border-t-0 border-dc-hairline p-4"
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
