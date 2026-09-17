"use client";

import type React from "react";
import cn from "classnames";
import { Wrench } from "lucide-react";
import { appDebugEnabled } from "@/components/DebugPanel";

/**
 * Opens the 3D map tuning panel (DebugPanel). Styled like the app-wide dev
 * panel's trigger (dark 44px disc, components/DebugPanel) so the two dev tools
 * read as a pair. It used to hang off `?debug`, but that panel owns the param
 * and carries it across every link, so the map panel kept appearing uninvited.
 * Positioned by DebugCorner.
 */
export function DebugToggle({ pressed, onToggle }: { pressed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label="3D map debug"
      title="3D map debug"
      onClick={onToggle}
      className={cn(
        "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105",
        pressed ? "bg-dc-purple text-white" : "bg-gray-900 text-white"
      )}
    >
      <Wrench className="h-5 w-5" />
    </button>
  );
}

/**
 * Top-left corner of the map from lg up (no debug tools on phones since
 * 2026-09-17). Holds the toggle with the panel opening beneath it. The app-wide dev trigger (components/DebugPanel) docks itself
 * under the wrench on /map with `fixed` positioning (its offsets are hardcoded
 * against this column), so the column keeps a 44px slot for it whenever that
 * trigger is available; the tuning panel then opens below both.
 */
export function DebugCorner({ children, panel }: { children: React.ReactNode; panel?: React.ReactNode }) {
  return (
    <div className="fixed left-6 top-[80px] z-20 hidden flex-col items-start gap-3 lg:flex">
      {children}
      {appDebugEnabled() && <div aria-hidden className="h-11 w-11" />}
      {panel}
    </div>
  );
}
