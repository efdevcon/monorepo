"use client";

import type { ReactNode } from "react";
import cn from "classnames";
import { Check, Gift, QrCode } from "lucide-react";
import { useRetryOnReconnect } from "@/hooks/useRetryOnReconnect";
import type { QrModalTarget } from "./QrModals";
import { displayItemName } from "./ticketTheme";

/** Swag footer strip keeps the default Devcon tint at every ticket style. */
const STRIP_BG = "linear-gradient(to top, #fbfafc 19.982%, #fff5fa 100%)";

/**
 * Swag item card (Figma 5088-116 mobile list / 5088-1059 desktop shelf):
 * product photo over a name strip with a QR affordance. The whole card is one
 * button opening the QR modal. `shelfOnDesktop` opts the My Devcon page's
 * card into the horizontal-scroller sizing (361 wide, stretching to the
 * shelf's height); elsewhere (home grid) the stacked 203px-image layout
 * applies at all widths.
 *
 * With an `action` (swag to buy, data/tickets/swagAdditions.ts) the card is
 * not a button: no QR, the price takes the "Swag" label's line and the action
 * (the Buy button) sits on the right of the strip.
 */
export function SwagCard({
  title,
  imageUrl,
  qr,
  collected = false,
  onQrClick,
  shelfOnDesktop = false,
  price,
  note,
  action,
}: {
  title: string;
  imageUrl?: string;
  qr?: string;
  /** Handed over at the swag station (Pretix check-in on the position). */
  collected?: boolean;
  onQrClick?: (target: QrModalTarget) => void;
  shelfOnDesktop?: boolean;
  /** Swag to buy: its price, shown bold in place of the "Swag" label. */
  price?: string;
  /** A short muted line after the price ("up to 2"). */
  note?: string;
  /** Swag to buy: the control on the right of the strip, in place of "View QR". */
  action?: ReactNode;
}) {
  // Product photos come mirrored from Supabase Storage (api/tickets/pictures.ts)
  // so the SW can cache them for offline. Retry once the connection returns and
  // show the placeholder instead of a broken image in the meantime (CLAUDE.md
  // "Images (offline)").
  const { failed, attempt, markFailed } = useRetryOnReconnect();
  const showImage = imageUrl && !failed;
  const name = displayItemName(title);
  const purchasable = action !== undefined;
  const Root = purchasable ? "div" : "button";

  return (
    <Root
      {...(purchasable
        ? {}
        : {
            onClick: qr && onQrClick ? () => onQrClick({ kind: "swag", qr, title: name, collected }) : undefined,
            disabled: !qr,
          })}
      className={cn(
        // outline (not border) so the stroke sits just OUTSIDE the card
        // without shifting the image/strip by 1px. Hover tints it the same
        // purple the home-page cards use; focus-visible upgrades it so
        // keyboard focus stays legible.
        // A row on mobile (image left, strip right); the desktop shelf card
        // stacks the image over the strip as before.
        "flex flex-row overflow-clip rounded-[8px] text-left outline outline-dc-hairline",
        !purchasable &&
          "cursor-pointer transition-[scale,outline-color] duration-150 ease-out enabled:hover:outline-dc-purple/40 focus-visible:outline-2 focus-visible:outline-dc-purple disabled:cursor-default motion-safe:enabled:hover:scale-[1.03] motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none",
        shelfOnDesktop && "lg:h-full lg:w-[361px] lg:shrink-0 lg:flex-col lg:rounded-[12px]"
      )}
    >
      {/* No aria-label (it would hide the product name from screen readers);
          the strip text names the button, this hint states the action. */}
      {!purchasable && <span className="sr-only">Enlarge QR code.</span>}
      <div
        className={cn(
          // Mobile row: a fixed-width box that stretches to the strip's
          // height; the desktop shelf stretches the image to fill the column
          // instead. The image is absolutely positioned so an in-flow
          // portrait photo can never inflate the box.
          "relative w-[88px] shrink-0 self-stretch",
          shelfOnDesktop && "lg:min-h-0 lg:w-full lg:flex-1"
        )}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={attempt}
            src={imageUrl}
            // CORS mode keeps the SW cache entry non-opaque (CLAUDE.md rule 2).
            crossOrigin="anonymous"
            onError={markFailed}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-dc-panel">
            <Gift className="size-10 text-dc-purple-soft" aria-hidden="true" />
          </div>
        )}
        {collected && (
          // Same pill as the ticket's "Checked in" (sonner success palette).
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-dc-green-soft px-3 py-1 text-[12px] font-semibold leading-4 text-dc-fg2 shadow-sm">
            <Check className="size-3.5" />
            Collected
          </span>
        )}
      </div>
      {/* Strip (Scott, 2026-11-04): name, "Swag" label, then a "View QR"
          line with a small QR icon, stacked and top-aligned. On mobile it
          is the right-hand column and sets the row's height; on the desktop
          shelf the image takes the stretch instead, the name is a size up
          and View QR moves to the right of the strip. The desktop strip has
          one minimum height (fits the Buy button of swag to buy), so photos
          line up across claimable and purchasable cards. */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col items-start gap-1.5 px-3 py-3",
          // Swag to buy: the action sits on the right at every width.
          purchasable && "flex-row items-center gap-3",
          shelfOnDesktop &&
            "lg:min-h-20 lg:w-full lg:flex-none lg:flex-row lg:items-center lg:gap-6 lg:p-4"
        )}
        style={{ background: STRIP_BG }}
      >
        <div className={cn("flex min-w-0 flex-col gap-1", (purchasable || shelfOnDesktop) && "flex-1")}>
          <p
            className={cn(
              "text-[14px] font-medium leading-[1.25] tracking-[-0.1px] text-dc-fg2 [word-break:break-word]",
              shelfOnDesktop && "lg:text-[18px] lg:tracking-[-0.25px]"
            )}
          >
            {name}
          </p>
          {purchasable ? (
            <p className="text-[14px] font-bold leading-5 text-dc-fg2">
              {price}
              {note && <span className="text-[11px] font-medium text-dc-muted"> · {note}</span>}
            </p>
          ) : (
            <p className="text-[11px] font-medium leading-none text-[#9256d2]">
              {collected ? "Swag · Collected" : "Swag"}
            </p>
          )}
        </div>
        {purchasable ? (
          <div className="shrink-0">{action}</div>
        ) : (
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-1 text-[12px] font-semibold leading-4 text-dc-purple",
              shelfOnDesktop && "lg:mt-0 lg:shrink-0"
            )}
          >
            <QrCode className="size-3.5" aria-hidden="true" />
            View QR
          </span>
        )}
      </div>
    </Root>
  );
}
