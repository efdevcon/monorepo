"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import type { TicketStyle } from "@/data/tickets/types";
import { CloseButton } from "@/components/Buttons";
import { TICKET_THEMES } from "./ticketTheme";

/** What the QR modal shows: an event ticket (themed frame + entrance copy) or
 *  a swag item (purple frame + swag-station copy). */
export type QrModalTarget =
  | {
      kind: "ticket";
      qr: string;
      title: string;
      style: TicketStyle;
      /** Pretix has seen this ticket scanned at venue check-in. */
      checkedIn?: boolean;
    }
  | { kind: "swag"; qr: string; title: string };

const MODAL_BG = "linear-gradient(to top, #fbfafc 19.982%, #fff5fa 100%)";

/**
 * Enlarged-QR modal (Figma Modal/View-QR, 5088-473 ticket / 5088-665 swag).
 * Centered at every breakpoint per the designs. Backdrop click and Escape
 * both close.
 */
export function QrModal({
  target,
  onClose,
}: {
  target: QrModalTarget | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!target) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [target, onClose]);

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={target.title}
            className="relative flex w-full max-w-[361px] flex-col items-center rounded-[12px] pt-6 shadow-[0_10px_15px_rgba(22,11,43,0.1),0_4px_6px_rgba(22,11,43,0.1)]"
            style={{ background: MODAL_BG }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* 204px QR frame: 2px themed border, 10px white padding, 180px QR */}
            <div
              className="rounded-[8px] p-[2px]"
              style={{
                background:
                  target.kind === "ticket"
                    ? TICKET_THEMES[target.style].accent
                    : "var(--color-dc-purple)",
              }}
            >
              <div className="rounded-[6px] bg-white p-[10px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={target.qr}
                  alt={`${target.title} QR code`}
                  className="size-[180px] rounded-[4px]"
                />
              </div>
            </div>

            <div className="flex w-full flex-col items-center gap-4 px-4 py-6 text-center">
              <div className="flex w-full flex-col gap-2">
                <p className="text-[16px] font-bold leading-6 text-dc-fg2">
                  {target.title}
                </p>
                {target.kind === "ticket" ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <p className="text-[14px] font-bold leading-5 text-dc-purple">
                        Nov 3–6, 2026
                      </p>
                      <p className="text-[14px] leading-5 text-dc-muted">
                        09:00–18:00 every day
                      </p>
                    </div>
                    <p className="text-[14px] leading-5 text-dc-fg2">
                      Present this QR at the entrance to register
                    </p>
                    {target.checkedIn && (
                      // Sonner success-toast palette (globals.css).
                      <span className="mt-1 inline-flex items-center gap-1 self-center rounded-full bg-dc-green-soft px-3 py-1 text-[12px] font-semibold leading-4 text-dc-green">
                        <Check className="size-3.5" />
                        Checked in
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-[14px] leading-5 text-dc-fg2">
                    Present this QR at the Swag Station to claim
                  </p>
                )}
              </div>
              {target.kind === "swag" && (
                // Figma annotation: "Will link to Swag Station location on
                // in-app map (future iteration)" — closes the modal until the
                // station has a map POI. Sized per the design's Button-Small
                // (Buttons.tsx primitives are the large 48px CTA), with the
                // same motion-safe transition conventions.
                <button
                  onClick={onClose}
                  className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-dc-purple pl-4 pr-3 text-[14px] font-bold leading-none text-dc-purple-fg transition-[scale,background-color] duration-150 ease-out hover:bg-[#6730d5] motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97] motion-reduce:transition-none"
                >
                  Claim at Swag Station
                  <ArrowRight className="size-4" />
                </button>
              )}
            </div>

            <CloseButton onClick={onClose} className="absolute right-3 top-3" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
