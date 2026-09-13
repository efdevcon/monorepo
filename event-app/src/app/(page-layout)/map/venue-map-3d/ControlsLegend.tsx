"use client";

import type { ReactNode } from "react";
import cn from "classnames";
import { Hand, Mouse, MousePointerClick, Move, Pointer, Rotate3d, ZoomIn, type LucideIcon } from "lucide-react";
import { useMediaQuery } from "@/hooks/useIsDesktop";
import type { MapView } from "./types";

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
 * Icon legend of what the pointer does in the current view, at the bottom of
 * the map under the Find pill on phones and centred on its row from lg up.
 * Desktop adds the floor shortcuts. Fades out while the area card or Find is
 * open.
 */
export function ControlsLegend({ view, pannable, stacked, hidden }: { view: MapView; pannable: boolean; stacked: boolean; hidden: boolean }) {
  const touch = useMediaQuery("(pointer: coarse)");
  const target: Item = touch
    ? { Icon: Pointer, label: stacked ? "Tap a floor" : "Tap an area" }
    : { Icon: Pointer, label: stacked ? "Click a floor" : "Click an area" };
  // What to click/tap comes first (Scott): it's the one action people are looking for.
  const items: (Item | false)[] =
    view === "top"
      ? [
          target,
          { Icon: Move, label: "Drag pans" },
          touch ? { Icon: ZoomIn, label: "Pinch zooms" } : { Icon: Mouse, label: "Scroll zooms" },
          touch ? { Icon: Pointer, label: "Double tap zoom-in" } : { Icon: MousePointerClick, label: "Double click zoom-in" },
        ]
      : touch
        ? [
            target,
            { Icon: Hand, label: "Swipe rotates" },
            pannable && { Icon: Move, label: "Two fingers pan" },
            { Icon: ZoomIn, label: "Pinch zooms" },
            { Icon: Pointer, label: "Double tap zoom-in" },
          ]
        : [
            target,
            { Icon: Rotate3d, label: "Drag rotates" },
            pannable && { Icon: Move, label: "Right-drag pans" },
            { Icon: Mouse, label: "Scroll zooms" },
            { Icon: MousePointerClick, label: "Double click zoom-in" },
          ];

  return (
    <div
      aria-hidden={hidden}
      className={cn(
        // Positioned by the bottom-controls wrapper in VenueMap3D: full width under the Find pill on
        // phones, centred on the pill's row from lg up.
        "pointer-events-none flex w-full justify-center lg:absolute lg:bottom-0 lg:left-1/2 lg:w-auto lg:-translate-x-1/2",
        "transition-opacity duration-150 ease-out motion-reduce:transition-none",
        hidden ? "opacity-0" : "opacity-100"
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-xl bg-white/85 px-3 py-2 shadow-[0_1px_3px_rgba(22,11,43,0.12)] backdrop-blur lg:flex-nowrap">
        {items
          .filter((i): i is Item => Boolean(i))
          .map(({ Icon, label }) => (
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
              <Kbd>G</Kbd>
              <Kbd>1</Kbd>
              <Kbd>2</Kbd>
              Floors
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
              <Kbd>F</Kbd>
              Find
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
              <Kbd>Esc</Kbd>
              Reset
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
