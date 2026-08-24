"use client";

import { Star } from "lucide-react";
import cn from "classnames";

/**
 * Shared toolbar-pill primitives (Figma): the purple ghost text-button
 * ("Jump to now", "A–Z index") and the Interested toggle pill, used by the
 * schedule and speakers action rows so both pages share identical sizing.
 */
export const ghostPill =
  "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-bold leading-none text-dc-purple transition-colors duration-150 ease-out hover:bg-dc-purple-wash";

/** Interested toggle pill (Figma "InterestedCTA"): lavender fill when active. */
export function InterestedPill({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-[14px] leading-none text-dc-fg2 transition-colors duration-150 ease-out",
        active
          ? "border-dc-purple bg-dc-lavender"
          : "border-dc-hairline bg-white hover:bg-dc-purple-wash",
        className
      )}
    >
      <Star className="size-4 text-dc-purple" fill="currentColor" />
      Interested
    </button>
  );
}
