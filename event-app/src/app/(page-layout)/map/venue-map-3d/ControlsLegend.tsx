"use client";

import type { ReactNode } from "react";
import cn from "classnames";
import { Hand, Mouse, MousePointerClick, Move, Pointer, Rotate3d, ZoomIn, type LucideIcon } from "lucide-react";
import { useMediaQuery } from "@/hooks/useIsDesktop";
import { useOnline } from "@/hooks/useOnline";

type Item = { Icon: LucideIcon; label: string };

/** Keyboard hint chip (desktop only). */
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[4px] border border-dc-hairline bg-dc-panel px-1.5 py-0.5 font-sans text-[11px] font-semibold leading-none text-dc-muted">
      {children}
    </kbd>
  );
}

/**
 * The strip along the top of the map that the legends share: full width
 * under the status bar on phones (no header bar on /map; the chip row wraps),
 * centred under the header from lg up. The controls legend sits here while the
 * floors are stacked, the floor legend while one floor is open. Fades out
 * (`hidden`) while the area card or a panel is open; `dismissed` fades it on
 * phones only (the controls legend after the first gesture).
 */
export function TopStrip({ hidden, dismissed = false, label, children }: { hidden: boolean; dismissed?: boolean; label?: string; children: ReactNode }) {
  const online = useOnline();
  return (
    <div
      aria-hidden={hidden}
      aria-label={label}
      className={cn(
        // Phones: full width 12px under the status bar (the mobile header bar is off on /map); while offline it
        // leaves the top-right corner to the offline marker. Desktop: centred, 15px under the 65px header (shared with the wrench).
        "pointer-events-none fixed inset-x-4 top-[calc(var(--safe-top)+12px)] z-10 flex justify-center lg:left-1/2 lg:right-auto lg:top-[80px] lg:-translate-x-1/2",
        !online && "max-lg:right-14",
        "transition-opacity duration-150 ease-out motion-reduce:transition-none",
        hidden ? "opacity-0" : "opacity-100",
        dismissed && "max-lg:opacity-0"
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-lg border border-dc-hairline bg-white/85 px-3 py-2 backdrop-blur lg:flex-nowrap">{children}</div>
    </div>
  );
}

/**
 * Icon legend of what the pointer does, in the top strip while the floors are
 * stacked (the floor legend takes the strip once a floor is open; Scott,
 * 2026-09-21). Desktop adds the keyboard shortcuts. Fades out while the area
 * card or a panel is open (`hidden`, every breakpoint). On phones it also goes
 * once the user has made a gesture and comes back with the stacked view
 * (`dismissed`, CSS `max-lg:` so the desktop legend stays put) — Scott, 2026-09-18.
 */
export function ControlsLegend({ hidden, dismissed }: { hidden: boolean; dismissed: boolean }) {
  const touch = useMediaQuery("(pointer: coarse)");
  // What to click/tap comes first (Scott): it's the one action people are looking for.
  const items: Item[] = touch
    ? [
        { Icon: Pointer, label: "Tap a floor" },
        { Icon: Hand, label: "Swipe pans" },
        { Icon: Rotate3d, label: "Two fingers rotate" },
        { Icon: ZoomIn, label: "Pinch zooms" },
        { Icon: Pointer, label: "Double tap zoom-in" },
      ]
    : [
        { Icon: Pointer, label: "Click a floor" },
        { Icon: Rotate3d, label: "Drag rotates" },
        { Icon: Move, label: "Right-drag pans" },
        { Icon: Mouse, label: "Scroll zooms" },
        { Icon: MousePointerClick, label: "Double click zoom-in" },
      ];

  return (
    <TopStrip hidden={hidden} dismissed={dismissed}>
      {items.map(({ Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
          <Icon className="size-3.5 shrink-0 text-dc-purple" aria-hidden />
          {label}
        </span>
      ))}
      {!touch && (
        // Key chips from lg up (CSS, so the first paint is right without waiting for a media-query effect).
        <span className="hidden lg:contents">
          <span aria-hidden className="h-4 w-px bg-dc-hairline" />
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
            <Kbd>1</Kbd>
            <Kbd>2</Kbd>
            <Kbd>3</Kbd>
            Floors
          </span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
            <Kbd>/</Kbd>
            Search
          </span>
          {/* A does the same as Esc but stays unlisted (Scott). */}
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
            <Kbd>Esc</Kbd>
            All floors
          </span>
        </span>
      )}
    </TopStrip>
  );
}
