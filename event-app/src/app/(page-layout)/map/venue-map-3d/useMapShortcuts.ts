"use client";

import { useEffect } from "react";
import { usePaneActive } from "@/components/paneContext";
import { useDetailView } from "@/routing/detailRoute";
import type { LevelId } from "./types";

type Handlers = {
  /** Show one floor (idempotent: pressing the active floor's key again does nothing). */
  showLevel: (level: LevelId) => void;
  /** Back to every floor stacked at the start view (same as re-tapping the Map tab). */
  reset: () => void;
};

/** Single-key floor shortcuts; the legend advertises them on desktop. */
const LEVEL_KEYS: Record<string, LevelId> = { g: "G", "1": "L1", "2": "L2" };

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Map keyboard shortcuts: G / 1 / 2 open a floor, Escape returns to the
 * stacked start view. Listens on window while the Map pane is the visible one
 * (every visited pane stays mounted), and stands down while the user types in
 * a field, holds a modifier, has Find open (it owns Escape) or has a detail
 * view open over the map (DetailLayer owns Escape there).
 */
export function useMapShortcuts({ showLevel, reset }: Handlers, { enabled }: { enabled: boolean }) {
  const active = usePaneActive();
  const detail = useDetailView().kind !== null;

  // Both handlers are stable useCallbacks in VenueMap3D, so the listener only re-binds on the gates.
  useEffect(() => {
    if (!active || !enabled || detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "Escape") {
        reset();
        return;
      }
      const level = LEVEL_KEYS[e.key.toLowerCase()];
      if (level) showLevel(level);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, enabled, detail, showLevel, reset]);
}
