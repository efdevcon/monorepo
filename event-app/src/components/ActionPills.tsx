"use client";

import { Star } from "lucide-react";
import cn from "classnames";
import type { ComponentProps, ReactNode } from "react";

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

/**
 * Mobile app-header pill (Figma "New Top Nav"): 32px white hairline pill,
 * 16px purple icon, 12px label; lavender fill + purple border when active,
 * with an optional 12px count bubble on the top-right corner. Replaced the
 * icon-only circles — testers didn't read the star and clock glyphs.
 * before:-inset-1.5 pads the 32px pill to the 44px touch floor.
 */
export function HeaderPill({
  icon,
  label,
  active = false,
  count,
  className,
  ...props
}: ComponentProps<"button"> & {
  icon: ReactNode;
  label: string;
  active?: boolean;
  /** Shown as a bubble when > 0. */
  count?: number;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "relative flex min-h-8 cursor-pointer items-center justify-center gap-2 rounded-full border py-1 pl-[10px] pr-3 text-[12px] leading-none text-dc-fg transition-colors duration-150 ease-out before:absolute before:-inset-1.5 before:content-['']",
        active ? "border-dc-purple bg-dc-lavender" : "border-dc-hairline bg-white",
        className
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4 [&>svg]:text-dc-purple">
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {count != null && count > 0 && (
        <span className="absolute -right-[3px] -top-1 flex size-3 items-center justify-center rounded-full bg-dc-purple text-[10px] font-medium leading-none tracking-[-0.25px] text-white ring-1 ring-white">
          {count}
        </span>
      )}
    </button>
  );
}
