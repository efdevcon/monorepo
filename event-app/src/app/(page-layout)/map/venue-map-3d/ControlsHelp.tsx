"use client";

import cn from "classnames";
import { useMediaQuery } from "@/hooks/useIsDesktop";
import type { MapView } from "./types";

/** One-line hint of what the pointer does in the current view. Hidden while the area card is open. */
export function ControlsHelp({ view, pannable, stacked, hidden }: { view: MapView; pannable: boolean; stacked: boolean; hidden: boolean }) {
  const touch = useMediaQuery("(pointer: coarse)");
  const press = touch ? "Tap" : "Click";
  const target = stacked ? `${press} a floor to open it` : `${press} an area for details`;
  const parts =
    view === "top"
      ? touch
        ? ["Drag to pan", "Pinch to zoom", "Double-tap to zoom in", target]
        : ["Drag to pan", "Scroll to zoom", "Double-click to zoom in", target]
      : touch
        ? [stacked && target, "Swipe to rotate", pannable && "Two fingers to pan", "Pinch to zoom", "Double-tap to zoom in", !stacked && target]
        : [stacked && target, "Drag to rotate", pannable && "Right-drag to pan", "Scroll to zoom", "Double-click to zoom in", !stacked && target];

  return (
    <p
      aria-hidden={hidden}
      className={cn(
        // left-[76px] clears the dev DebugPanel trigger on mobile (see AreaCard).
        "pointer-events-none fixed right-4 left-[76px] z-10 text-center text-[12px] leading-snug text-dc-muted lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:whitespace-nowrap",
        "transition-opacity duration-150 ease-out motion-reduce:transition-none",
        hidden ? "opacity-0" : "opacity-100"
      )}
      style={{ bottom: "calc(var(--nav-clearance) + 16px)" }}
    >
      <span className="inline-block rounded-full bg-white/85 px-3 py-1.5 shadow-[0_1px_3px_rgba(22,11,43,0.12)] backdrop-blur">
        {parts.filter(Boolean).join("  ·  ")}
      </span>
    </p>
  );
}
