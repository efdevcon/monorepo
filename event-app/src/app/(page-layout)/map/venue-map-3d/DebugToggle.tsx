"use client";

import type React from "react";
import cn from "classnames";
import { Wrench } from "lucide-react";

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
 * Top-left corner of the map: under the source switch's caption on phones, the
 * free corner from lg up. Holds the toggle with the panel opening beneath it.
 */
export function DebugCorner({ children }: { children: React.ReactNode }) {
  return <div className="fixed left-4 top-[calc(3.5rem+var(--safe-top)+76px)] z-20 flex flex-col items-start gap-3 lg:left-6 lg:top-[80px]">{children}</div>;
}
