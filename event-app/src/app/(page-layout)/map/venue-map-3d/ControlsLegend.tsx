"use client";

import type { ReactNode } from "react";
import cn from "classnames";
import { Hand, Mouse, MousePointerClick, Move, Pointer, Rotate3d, ZoomIn, type LucideIcon } from "lucide-react";
import { useIsDesktop, useMediaQuery } from "@/hooks/useIsDesktop";
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
 * Icon legend of what the pointer does in the current view, sitting above the
 * Find control at the bottom of the map (bottom-centre from lg up, on the
 * Find pill's row). Desktop adds the floor shortcuts. Fades out while the
 * area card or Find is open.
 */
export function ControlsLegend({ view, pannable, stacked, hidden }: { view: MapView; pannable: boolean; stacked: boolean; hidden: boolean }) {
  const touch = useMediaQuery("(pointer: coarse)");
  const desktop = useIsDesktop();
  const target: Item = touch
    ? { Icon: Pointer, label: stacked ? "Tap a floor" : "Tap an area" }
    : { Icon: Pointer, label: stacked ? "Click a floor" : "Click an area" };
  const items: (Item | false)[] =
    view === "top"
      ? [
          { Icon: Move, label: "Drag pans" },
          touch ? { Icon: ZoomIn, label: "Pinch zooms" } : { Icon: Mouse, label: "Scroll zooms" },
          touch ? { Icon: Pointer, label: "Double-tap zooms" } : { Icon: MousePointerClick, label: "Double-click zooms" },
          target,
        ]
      : touch
        ? [
            { Icon: Hand, label: "Swipe rotates" },
            pannable && { Icon: Move, label: "Two fingers pan" },
            { Icon: ZoomIn, label: "Pinch zooms" },
            { Icon: Pointer, label: "Double-tap zooms" },
            target,
          ]
        : [
            { Icon: Rotate3d, label: "Drag rotates" },
            pannable && { Icon: Move, label: "Right-drag pans" },
            { Icon: Mouse, label: "Scroll zooms" },
            { Icon: MousePointerClick, label: "Double-click zooms" },
            target,
          ];

  return (
    <div
      aria-hidden={hidden}
      className={cn(
        "pointer-events-none fixed inset-x-4 z-10 flex justify-center lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2",
        "transition-opacity duration-150 ease-out motion-reduce:transition-none",
        hidden ? "opacity-0" : "opacity-100"
      )}
      // Mobile: above the 36px Find pill (nav + 12 + 36 + 8). Desktop: the Find pill's row.
      style={{ bottom: desktop ? "1.5rem" : "calc(var(--nav-clearance) + 56px)" }}
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
        {desktop && !touch && (
          <>
            <span aria-hidden className="h-4 w-px bg-dc-hairline" />
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
              <Kbd>G</Kbd>
              <Kbd>1</Kbd>
              <Kbd>2</Kbd>
              Floors
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] leading-none text-dc-muted">
              <Kbd>Esc</Kbd>
              Reset
            </span>
          </>
        )}
      </div>
    </div>
  );
}
