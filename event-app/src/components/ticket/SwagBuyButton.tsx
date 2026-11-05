"use client";

import { useState, type MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { trackEvent } from "@/data/analytics/track";
import { escapeToBrowser, handoffMode } from "@/data/tickets/useTicketProof";
import type { SwagAdditionOffer } from "@/data/tickets/swagAdditions";
import { swagCheckoutUrl } from "@/data/tickets/useSwagAdditions";

export const formatSwagPrice = (offer: Pick<SwagAdditionOffer, "price" | "currency">) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: offer.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(offer.price));

/**
 * The action on a purchasable swag card (SwagCard `action`): Buy gets the
 * ticket's voucher for the addition (api/swag-additions), then Checkout opens
 * its Pretix page. Inside the installed app checkout opens in the real browser
 * (wallets and saved cards live there), as the ENS hand-off does.
 */
export function SwagBuyButton({ offer, ticketSecret }: { offer: SwagAdditionOffer; ticketSecret: string }) {
  const [state, setState] = useState<{ status: "idle" | "preparing" | "ready" | "error"; url?: string }>({
    status: "idle",
  });
  const soldOut = offer.remaining === 0;

  const prepare = async () => {
    trackEvent("swag", "addition-buy", offer.name);
    setState({ status: "preparing" });
    try {
      setState({ status: "ready", url: await swagCheckoutUrl(ticketSecret, offer.itemId) });
    } catch {
      setState({ status: "error" });
    }
  };

  const openCheckout = (e: MouseEvent<HTMLAnchorElement>) => {
    trackEvent("swag", "addition-checkout", offer.name);
    if (state.url && handoffMode() === "escape") {
      e.preventDefault();
      escapeToBrowser(state.url);
    }
  };

  if (state.status === "ready" && state.url && !soldOut) {
    return (
      <a
        href={state.url}
        target="_blank"
        rel="noreferrer"
        onClick={openCheckout}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-dc-purple px-4 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Checkout
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void prepare()}
      disabled={soldOut || state.status === "preparing"}
      aria-label={soldOut ? `${offer.name}: already bought` : `Buy ${offer.name} for ${formatSwagPrice(offer)}`}
      className="h-9 shrink-0 cursor-pointer rounded-full border border-dc-purple px-4 text-[14px] font-semibold text-dc-purple transition-colors hover:bg-dc-purple-wash disabled:cursor-default disabled:border-dc-hairline disabled:text-dc-muted disabled:hover:bg-transparent"
    >
      {soldOut ? "Bought" : state.status === "preparing" ? "Preparing…" : state.status === "error" ? "Try again" : "Buy"}
    </button>
  );
}
