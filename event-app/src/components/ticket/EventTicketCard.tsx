"use client";

import { useEffect, useRef, useState } from "react";
import cn from "classnames";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import type { Ticket } from "@/data/tickets/types";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";
import { usePaneActive } from "@/components/paneContext";
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
/** Human identifier printed under the QR: the order and the ticket's number in it (see ticketOrdinals). */
export interface TicketReference {
  orderCode: string;
  ordinal: number;
}

// ---------------------------------------------------------------------------
// The tear-off (concept, Scott 2026-11-04). Once the ticket is checked in the
// bottom half tears away along the perforation and the stub stays, still
// opening the QR popup on tap. One timeline, all in seconds: the tear starts
// at the right notch and the right side drops (gravity, ease-in) until the
// piece hangs from the left notch; it swings there like a pendulum coming to
// rest (REST_ANGLE: a 361×138 piece hung from a corner settles with its
// centre of mass under the pivot, atan(138/361) off the vertical ≈ 69°);
// then the last fibres give, it falls and fades, and the page below closes
// the gap as it goes. Held while the QR popup is open (that is where the
// scan flips it) and until the pane is on screen; plays once per mount.
// ---------------------------------------------------------------------------
const REST_ANGLE = 69;
const TEAR_DELAY_MS = 600;
/** When the piece lets go, in seconds from the start of the tear. */
const FALL_AT = 1.95;
const TEAR_DURATION = 2.5;
const t = (sec: number) => sec / TEAR_DURATION;
const TEAR_ROTATE = {
  rotate: [0, 74, 63, 72.5, 66, 70.5, 68, REST_ANGLE, REST_ANGLE, 84],
  times: [0, 0.5, 0.72, 0.95, 1.18, 1.4, 1.62, 1.85, FALL_AT, TEAR_DURATION].map(t),
  // Drop with gravity, then ease-in-out half swings, hold, tumble as it falls.
  ease: [[0.55, 0, 1, 0.45], "easeInOut", "easeInOut", "easeInOut", "easeInOut", "easeInOut", "easeInOut", "linear", "easeIn"] as const,
};
const TEAR_FALL = {
  y: [0, 0, 440],
  yTimes: [0, t(FALL_AT), 1],
  opacity: [1, 1, 0],
  opacityTimes: [0, t(FALL_AT + 0.3), 1],
};

type TearPhase = "intact" | "tearing" | "torn";

export function EventTicketCard({
  ticket,
  qr,
  reference,
  onQrClick,
  tearHold = false,
}: {
  ticket: Ticket;
  qr?: string;
  reference?: TicketReference;
  onQrClick: (target: QrModalTarget) => void;
  /** Keep the bottom half on while true (a QR popup is open). */
  tearHold?: boolean;
}) {
  const { attempt: logoAttempt, markFailed: markLogoFailed } =
    useRetryOnReconnect();
  const checkedIn = ticket.hasCheckedIn === true;
  const paneActive = usePaneActive();
  const reducedMotion = useReducedMotion();
  const [tear, setTear] = useState<TearPhase>("intact");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [bottomHeight, setBottomHeight] = useState(0);
  useEffect(() => {
    if (!checkedIn || !paneActive || tearHold || tear !== "intact") return;
    // A beat with the whole ticket in view first, then the tear (reduced
    // motion: straight to the stub).
    const id = window.setTimeout(
      () => {
        if (reducedMotion) return setTear("torn");
        setBottomHeight(bottomRef.current?.offsetHeight ?? 0);
        setTear("tearing");
      },
      reducedMotion ? 0 : TEAR_DELAY_MS
    );
    return () => window.clearTimeout(id);
  }, [checkedIn, paneActive, tearHold, tear, reducedMotion]);
  const style = resolveTicketStyle(ticket);
  const theme = TICKET_THEMES[style];
  const typeName = displayItemName(ticket.itemName);
  const holder = ticket.attendeeName || ticket.attendeeEmail;
  // Event branding is fixed copy, like the venue block below (the Pretix
  // event name env var is lowercase "devcon" in prod).
  const modalTitle = `Devcon 8 India - ${typeName}`;

  return (
    // Each half wears a real border pulled outside the layout box with
    // negative margins, so the stroke sits OUTSIDE the 361px card (padding
    // still measures 16px from the card edge) and the notch masks cut it.
    // The whole ticket is one button opening the QR modal; the shadow is a
    // drop-shadow (not box-shadow) so it follows the notch cutouts, and it
    // deepens to a lightened shadow-md on hover.
    <button
      onClick={
        qr
          ? () =>
              onQrClick({
                kind: "ticket",
                qr,
                title: modalTitle,
                style,
                checkedIn: ticket.hasCheckedIn,
                reference,
              })
          : undefined
      }
      disabled={!qr}
      data-tear={tear}
      className={cn(
        "flex w-full cursor-pointer flex-col rounded-[12px] text-left transition-[scale,filter] duration-150 ease-out [filter:drop-shadow(0_1px_3px_rgba(22,11,43,0.1))_drop-shadow(0_1px_2px_rgba(22,11,43,0.1))] focus-visible:outline-2 focus-visible:outline-dc-purple disabled:cursor-default enabled:hover:[filter:drop-shadow(0_4px_6px_rgba(22,11,43,0.07))_drop-shadow(0_2px_4px_rgba(22,11,43,0.05))] motion-safe:enabled:hover:scale-[1.03] motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none",
        // The falling piece passes over whatever sits under the card.
        tear === "tearing" && "relative z-[1]"
      )}
    >
      {/* No aria-label: it would replace the accessible name and hide the
          holder/venue/dates from screen readers. The card's own text names
          the button; this hint states the action. */}
      <span className="sr-only">Enlarge QR code.</span>
      {/* Top half — product + holder + glyph art, dashed tear line below */}
      <div
        // `grow` + mt-auto on DEVCON.ORG: when carousel cards stretch to the
        // tallest sibling, the top half absorbs the extra height and keeps
        // DEVCON.ORG pinned above the tear line (no-op for a lone card).
        className="ticket-notch-top relative -mx-px -mt-px flex w-full grow flex-col gap-10 overflow-clip rounded-t-[12px] border border-dc-hairline p-4 [border-bottom:1px_dashed_rgba(34,17,68,0.2)]"
        style={{ background: ticketTopBackground(theme) }}
      >
        {/* Above the glyph (it is painted after this block): a long product
            name such as General Admission runs into the art otherwise. */}
        <div className="relative z-[1] flex flex-col gap-5">
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
            {reference && (
              // Third line of the identity block (what, who, which): the same
              // identifier the select rows and the Pretix order page use.
              <p className="text-[11px] font-semibold leading-none text-dc-muted">
                Order {reference.orderCode} · Ticket #{reference.ordinal}
              </p>
            )}
          </div>
        </div>
        <p className="relative z-[1] mt-auto text-[10px] font-bold leading-none text-dc-muted">
          DEVCON.ORG
        </p>
        <DC8Glyph
          style={style}
          className="pointer-events-none absolute right-[-70px] top-[calc(50%+0.5px)] h-[309px] w-[181px] -translate-y-1/2"
        />
        {ticket.hasCheckedIn === true && (
          // Scanned at the entrance: the swag card's "Collected" pill (sonner
          // success palette), in the card's top right corner over the glyph
          // (Scott, 2026-11-04).
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-dc-green-soft px-3 py-1 text-[12px] font-semibold leading-4 text-dc-fg2 shadow-sm">
            <Check className="size-3.5" />
            Checked in
          </span>
        )}
      </div>

      {/* Bottom half — QR + venue block. The height box keeps it in flow
          (so the stub above and the page below sit where they always did),
          then closes as the piece falls (see TEAR_* above); the piece is
          absolute while it animates and gone once torn. */}
      {tear !== "torn" && (
        <motion.div
          className="relative w-full shrink-0"
          style={tear === "tearing" ? { height: bottomHeight } : undefined}
          animate={tear === "tearing" ? { height: 0 } : undefined}
          transition={{ delay: FALL_AT, duration: 0.5, ease: [0.2, 0, 0, 1] }}
        >
          <motion.div
            ref={bottomRef}
            className={cn(
              "ticket-notch-bottom rounded-b-[12px] border border-t-0 border-dc-hairline p-4",
              tear === "tearing"
                ? "absolute -inset-x-px top-0"
                : "relative -mx-px -mb-px w-full"
            )}
            style={{
              background: ticketBottomBackground(theme),
              transformOrigin: "0px 0px",
            }}
            animate={
              tear === "tearing"
                ? { rotate: TEAR_ROTATE.rotate, y: TEAR_FALL.y, opacity: TEAR_FALL.opacity }
                : undefined
            }
            transition={{
              rotate: { duration: TEAR_DURATION, times: TEAR_ROTATE.times, ease: [...TEAR_ROTATE.ease] },
              y: { duration: TEAR_DURATION, times: TEAR_FALL.yTimes, ease: ["linear", [0.5, 0, 1, 1]] },
              opacity: { duration: TEAR_DURATION, times: TEAR_FALL.opacityTimes, ease: ["linear", "easeIn"] },
            }}
            onAnimationComplete={() => tear === "tearing" && setTear("torn")}
          >
            <div className="flex items-start gap-6">
              <span
                className="shrink-0 rounded-[8px] p-[2px]"
                style={{ background: theme.accent }}
              >
                <span className="block rounded-[6px] bg-white p-[2px]">
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qr}
                      alt=""
                      className="size-[98px] rounded-[4px]"
                    />
                  ) : (
                    <span className="block size-[98px] rounded-[4px]" />
                  )}
                </span>
              </span>
              <div className="flex min-w-0 flex-1 flex-col items-end justify-between gap-3 self-stretch py-1 text-right text-dc-muted">
                <div className="flex flex-col items-end gap-0.5">
                  <p className="text-[12px] font-bold leading-[1.15]">
                    MUMBAI, INDIA
                  </p>
                  <p className="text-[12.5px] leading-[1.15]">Nov 3–6, 2026</p>
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
          </motion.div>
        </motion.div>
      )}
    </button>
  );
}
