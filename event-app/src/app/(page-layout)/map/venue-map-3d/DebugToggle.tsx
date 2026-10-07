"use client";

import type React from "react";
import cn from "classnames";
import { Wrench } from "lucide-react";

/**
 * Opens the 3D map tuning panel (DebugPanel): a dark 44px disc, the look the
 * app-wide dev trigger had before it moved into the EF internal tools on My
 * Devcon (2026-10-02). It used to hang off `?debug`, but that param rides every
 * link, so the map panel kept appearing uninvited. Positioned by DebugCorner.
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
 * 2026-09-17). Holds the toggle with the panel opening beneath it.
 */
export function DebugCorner({ children, panel }: { children: React.ReactNode; panel?: React.ReactNode }) {
  return (
    <div className="fixed left-6 top-[80px] z-20 hidden flex-col items-start gap-3 lg:flex">
      {children}
      {panel}
    </div>
  );
}
