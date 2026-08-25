"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, ExternalLink, Share2, X } from "lucide-react";
import {
  canShare,
  copyLink,
  escapeToBrowser,
  handoffMode,
  shareLink,
  useTicketProof,
  type IssuedProof,
} from "@/data/tickets/useTicketProof";

const PARTNER = "ens";

/**
 * "Claim ENS perks" on a ticket row: mints a partner proof for that specific
 * ticket and hands the link off to a real browser.
 *
 * Event tickets only — swag and add-ons deliberately don't get one, since the
 * perk is one per event ticket.
 */
export function TicketProofButton({ ticketSecret }: { ticketSecret: string }) {
  const { proof, pending, error, sheetOpen, request, closeSheet } =
    useTicketProof(ticketSecret, PARTNER);

  return (
    <>
      <button
        type="button"
        onClick={request}
        disabled={pending}
        className="mt-2 inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-dc-hairline bg-white px-3 py-1 text-[12px] leading-none text-dc-muted transition-colors duration-150 ease-out hover:bg-dc-lavender disabled:cursor-default disabled:opacity-60"
      >
        {/* The partner's own mark, not a generic icon: this button leaves our
            app for theirs, and Lucide has no brand icons. Asset reused from
            devconnect-app rather than adding a second copy of the logo.
            eslint-disable-next-line @next/next/no-img-element */}
        <img src="/partners/ens.png" alt="" className="size-4 shrink-0" />
        {pending ? "Preparing…" : "Claim ENS perks"}
      </button>

      <AnimatePresence>
        {sheetOpen && (
          <HandoffSheet
            key="proof-handoff"
            proof={proof}
            error={error}
            onClose={closeSheet}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * The hand-off sheet, shown inside an installed PWA (and as the fallback when a
 * popup blocker vetoes the direct tab).
 *
 * The proof is already minted by the time this renders, which is the point: the
 * escape attempt is then a bare, synchronous action on the user's tap, with no
 * `await` in between for iOS to reject. Share and copy stay visible because the
 * iOS scheme hop can't be confirmed either way.
 */
function HandoffSheet({
  proof,
  error,
  onClose,
}: {
  proof: IssuedProof | null;
  error: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const mode = handoffMode();

  const onCopy = async () => {
    if (!proof) return;
    if (await copyLink(proof.claimUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      onClick={onClose}
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="proof-sheet-title"
        className="relative w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 cursor-pointer rounded-full p-1 text-dc-muted hover:bg-dc-lavender hover:text-dc-fg2"
        >
          <X className="size-5" />
        </button>

        {error || !proof ? (
          <>
            <h2
              id="proof-sheet-title"
              className="pr-8 text-[16px] font-bold text-dc-fg2"
            >
              Couldn&apos;t create your proof
            </h2>
            <p className="mt-2 text-sm text-dc-muted">
              {error || "Please try again in a moment."}
            </p>
          </>
        ) : (
          <>
            <h2
              id="proof-sheet-title"
              className="pr-8 text-[16px] font-bold text-dc-fg2"
            >
              Your {proof.partnerLabel} proof is ready
            </h2>
            <p className="mt-2 text-sm text-dc-muted">
              {mode === "escape"
                ? `Open this in your browser to claim on ${proof.partnerLabel}. You'll need to connect a wallet there, which works best outside the app.`
                : `Continue on ${proof.partnerLabel} to claim.`}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => escapeToBrowser(proof.claimUrl)}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-dc-purple px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <ExternalLink className="size-4" />
                Open in browser
              </button>

              {canShare() && (
                <button
                  type="button"
                  onClick={() =>
                    shareLink(
                      proof.claimUrl,
                      `${proof.partnerLabel} perks for Devcon attendees`
                    )
                  }
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-dc-hairline px-5 text-sm font-semibold text-dc-fg2 transition-colors hover:bg-dc-lavender"
                >
                  <Share2 className="size-4" />
                  Share…
                </button>
              )}

              <button
                type="button"
                onClick={onCopy}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-dc-hairline px-5 text-sm font-semibold text-dc-fg2 transition-colors hover:bg-dc-lavender"
              >
                {copied ? (
                  <Check className="size-4 text-green-600" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Link copied" : "Copy link"}
              </button>
            </div>

            {/* The floor: if every affordance above fails, the link is still
                here to be selected by hand. */}
            <p className="mt-4 break-all rounded-lg bg-dc-lavender/60 p-3 text-[11px] leading-relaxed text-dc-muted">
              {proof.claimUrl}
            </p>
            <p className="mt-2 text-[11px] text-dc-muted">
              This link expires in 30 minutes and works once.
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
