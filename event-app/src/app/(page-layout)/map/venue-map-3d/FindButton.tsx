"use client";

import cn from "classnames";
import { TextSearch } from "lucide-react";

export const FIND_PANEL_ID = "map-find-panel";

/**
 * Opens Find. Left end of the bottom-controls wrapper (VenueMap3D): above the
 * legend on phones (the area card overlays it there), on its row from lg up.
 */
export function FindButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      data-find-trigger
      aria-expanded={open}
      aria-controls={FIND_PANEL_ID}
      onClick={onClick}
      className={cn(
        "pointer-events-auto relative z-10 flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[14px] font-bold leading-none text-dc-purple shadow-[0_1px_3px_rgba(22,11,43,0.12)] backdrop-blur transition-colors duration-150 ease-out",
        open ? "border-dc-purple bg-dc-lavender" : "border-dc-hairline bg-white/90 hover:bg-dc-purple-wash"
      )}
    >
      <TextSearch className="size-4" aria-hidden />
      Find
    </button>
  );
}
