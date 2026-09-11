"use client";

import { useState } from "react";
import cn from "classnames";
import { CloseButton } from "@/components/Buttons";
import { iconFor, iconUrl } from "./icons";
import type { Area } from "./types";

/**
 * The small bottom card that opens when an area is tapped: name and a short
 * description, nothing more. Stays mounted so it can slide out; the last area
 * is kept while it fades.
 */
export function AreaCard({ area, onClose }: { area: Area | null; onClose: () => void }) {
  // Keep the last area while the card slides out (derived state from a prop).
  const [shown, setShown] = useState<Area | null>(area);
  if (area && area !== shown) setShown(area);
  const open = area !== null;
  const icon = shown ? (shown.icon ?? iconFor(shown.id)) : null;

  return (
    <div
      role="dialog"
      aria-label={shown?.name}
      aria-hidden={!open}
      className={cn(
        // left-[76px] clears the 44px dev DebugPanel trigger (left-4) that shares this corner on mobile.
        "fixed right-4 left-[76px] z-20 flex items-start gap-3 rounded-2xl bg-white/95 p-4 shadow-[0_8px_30px_rgba(22,11,43,0.18)] backdrop-blur lg:left-auto lg:right-6 lg:w-96",
        "transition-[translate,opacity] duration-150 ease-out motion-reduce:transition-none",
        open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
      style={{ bottom: "calc(var(--nav-clearance) + 16px)" }}
    >
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element -- static PNG under public/, no optimisation wanted
        <img src={iconUrl(icon)} alt="" className="size-14 shrink-0 object-contain" />
      )}
      <div className="min-w-0 flex-1 self-center">
        <p className="text-[16px] font-bold leading-tight text-dc-fg">{shown?.name}</p>
        {shown?.description && <p className="mt-1 text-[14px] leading-snug text-dc-muted">{shown.description}</p>}
      </div>
      <CloseButton onClick={onClose} tabIndex={open ? 0 : -1} />
    </div>
  );
}
