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
 * with an optional 16px count bubble on the top-right corner (widens to a
 * pill for two digits). Replaced the
 * icon-only circles — testers didn't read the star and clock glyphs.
 * before:-inset-1.5 pads the 32px pill to the 44px touch floor.
 */
export function HeaderPill({
  icon,
  label,
  active = false,
  count,
  pulse,
  onPulseEnd,
  className,
  ...props
}: ComponentProps<"button"> & {
  icon: ReactNode;
  label: string;
  active?: boolean;
  /** Shown as a bubble when > 0. */
  count?: number;
  /**
   * Transient "+1" bubble beside the label (see interestPulse.ts): mounts
   * per `key`, plays once (1.4s, house curve), then `onPulseEnd` clears it.
   * Absolutely positioned off the label so the text never shifts.
   */
  pulse?: { key: number; label: string } | null;
  onPulseEnd?: () => void;
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
      {/* Truncation on the inner span only: overflow-hidden on the bubble's
          positioning parent would clip it. */}
      <span className="relative min-w-0">
        <span className="block truncate">{label}</span>
        {pulse && (
          <span
            key={pulse.key}
            aria-hidden
            onAnimationEnd={onPulseEnd}
            className="absolute left-full top-1/2 ml-1.5 flex h-4 min-w-4 -translate-y-1/2 items-center justify-center rounded-full bg-dc-purple px-1 text-[10px] font-semibold leading-none text-white animate-interest-pulse motion-reduce:animate-interest-pulse-fade"
          >
            {pulse.label}
          </span>
        )}
      </span>
      {count != null && count > 0 && (
        <span className="absolute -right-1 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-dc-purple px-[5px] text-[11px] font-semibold leading-none tabular-nums tracking-[-0.25px] text-white ring-1 ring-white">
          {count}
        </span>
      )}
    </button>
  );
}
