"use client";

import cn from "classnames";
import { Gift, QrCode } from "lucide-react";
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
 */
export function SwagCard({
  title,
  imageUrl,
  qr,
  onQrClick,
  shelfOnDesktop = false,
}: {
  title: string;
  imageUrl?: string;
  qr?: string;
  onQrClick: (target: QrModalTarget) => void;
  shelfOnDesktop?: boolean;
}) {
  // Pretix-hosted product photos: retry once the connection returns, and show
  // the placeholder instead of a broken image in the meantime (CLAUDE.md
  // "Images (offline)" — remote images are never precached).
  const { failed, attempt, markFailed } = useRetryOnReconnect();
  const showImage = imageUrl && !failed;
  const name = displayItemName(title);

  return (
    <button
      onClick={qr ? () => onQrClick({ kind: "swag", qr, title: name }) : undefined}
      disabled={!qr}
      aria-label={`Enlarge ${name} QR code`}
      className={cn(
        "flex cursor-pointer flex-col overflow-clip rounded-[12px] border border-dc-hairline text-left transition-[scale] duration-150 ease-out disabled:cursor-default motion-safe:enabled:hover:scale-[1.03] motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none",
        shelfOnDesktop && "lg:h-full lg:w-[361px] lg:shrink-0"
      )}
    >
      <div
        className={cn(
          "h-[203px] w-full",
          shelfOnDesktop && "lg:h-auto lg:min-h-0 lg:flex-1"
        )}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={attempt}
            src={imageUrl}
            onError={markFailed}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-dc-panel">
            <Gift className="size-10 text-dc-purple-soft" aria-hidden="true" />
          </div>
        )}
      </div>
      <div
        className="flex w-full items-center gap-6 px-4 py-5"
        style={{ background: STRIP_BG }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[18px] font-medium leading-[1.25] tracking-[-0.25px] text-dc-fg2 [word-break:break-word]">
            {name}
          </p>
          <p className="text-[12px] font-medium leading-none text-[#9256d2]">
            Swag
          </p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center">
          <QrCode className="size-6 text-dc-purple" />
        </span>
      </div>
    </button>
  );
}
