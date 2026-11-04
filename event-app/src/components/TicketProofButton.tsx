"use client";

import { trackEvent } from "@/data/analytics/track";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Copy, ExternalLink, Share2, X } from "lucide-react";
import {
  canShare,
  copyLink,
  escapeToBrowser,
  handoffMode,
  shareLink,
  useTicketProof,
  type IssuedProof,
} from "@/data/tickets/useTicketProof";

type Tier = IssuedProof["tier"];

/**
 * Everything the button needs to know about one partner: the key the proof is
 * minted for and the copy around it. One object, every field required, so a
 * partner key can never ship with another partner's wording.
 */
export type ProofPartner = {
  /** Partner key as registered in the proof route's `PARTNERS`. */
  key: string;
  /** Button label. */
  label: string;
  /** Hand-off sheet heading. */
  title: string;
  /** Names the actual perk on the hand-off sheet, by minted tier. */
  describe: (tier: Tier) => string;
  /** Sheet copy inside a PWA: open the link in the browser, and what the user
      will do on the partner's page. */
  handoff: string;
};

/** The ENS partner: a free .eth name on any checked-in ticket (data/tickets/ensPerk.ts). */
const ENS_PARTNER: ProofPartner = {
  key: "ens",
  label: "Claim your free .eth name",
  title: "Free .eth for Devcon attendees",
  describe: () =>
    "Claim a free .eth name for one year with a self.xyz verified identity. Available until sold out.",
  handoff:
    "Open this link in your browser to claim. You'll need to connect a wallet to claim, which works best outside the app.",
};

/**
 * "Claim <partner> perks" on a ticket row: mints a partner proof for that
 * specific ticket and hands the link off to a real browser.
 *
 * ENS is the default so the original call sites read unchanged; another partner
 * passes itself as one `ProofPartner` (key plus copy).
 *
 * Event tickets only — swag and add-ons deliberately don't get one, since the
 * perk is one per event ticket.
 */
export function TicketProofButton({
  ticketSecret,
  partner,
}: {
  ticketSecret: string;
  /** Another partner with its own copy; left out, this is the ENS button. */
  partner?: ProofPartner;
}) {
  const p = partner ?? ENS_PARTNER;
  const { proof, pending, error, sheetOpen, request, closeSheet } =
    useTicketProof(ticketSecret, p.key);

  return (
    <>
      {/* Purple text-link CTA ("View all" style) — the flow leaves our app
          for the partner's, hence the outward arrow. The ENS mark now lives
          on the surrounding EnsPerkCard. */}
      <button
        type="button"
        onClick={() => {
          trackEvent("perks", "claim", p.key);
          void request();
        }}
        disabled={pending}
        // text-left: buttons center wrapped text by default, which reads
        // wrong when the label breaks onto two lines.
        className="mt-2 inline-flex min-h-8 cursor-pointer items-center gap-1 text-left text-[14px] font-bold leading-5 text-dc-purple underline-offset-2 enabled:hover:underline disabled:cursor-default disabled:opacity-60"
      >
        {pending ? "Preparing…" : p.label}
        <ArrowUpRight className="size-4 shrink-0" />
      </button>

      <AnimatePresence>
        {sheetOpen && (
          <HandoffSheet
            key="proof-handoff"
            proof={proof}
            error={error}
            title={p.title}
            describe={p.describe}
            handoff={p.handoff}
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
  title,
  describe,
  handoff,
  onClose,
}: {
  proof: IssuedProof | null;
  error: string | null;
  title: string;
  describe: (tier: Tier) => string;
  handoff: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const mode = handoffMode();

  useEffect(() => {
    if (proof) trackEvent("perks", "sheet-shown", proof.partner);
  }, [proof]);

  const onCopy = async () => {
    if (!proof) return;
    if (await copyLink(proof.claimUrl)) {
      trackEvent("perks", "copy", proof.partner);
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
              {title}
            </h2>
            {/* Name the actual perk so the hop is worth taking. Tier comes
                from the minted proof, so this needs no extra lookup. */}
            <p className="mt-2 text-sm text-dc-muted">{describe(proof.tier)}</p>
            <p className="mt-2 text-sm text-dc-muted">
              {mode === "escape"
                ? handoff
                : `Continue on ${proof.partnerLabel} to claim.`}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  trackEvent("perks", "open-browser", proof.partner);
                  escapeToBrowser(proof.claimUrl);
                }}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-dc-purple px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <ExternalLink className="size-4" />
                Open in browser
              </button>

              {canShare() && (
                <button
                  type="button"
                  onClick={() => {
                    trackEvent("perks", "share", proof.partner);
                    void shareLink(
                      proof.claimUrl,
                      `${proof.partnerLabel} perks for Devcon attendees`
                    );
                  }}
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
