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
  /** Open Search (/). */
  openSearch: () => void;
  /** Close the open area card (Esc / A close it first; the next press resets). */
  closeCard: () => void;
};

/** Single-key floor shortcuts, numbered from the ground up; the legend advertises them on desktop. */
export const LEVEL_KEYS: Record<LevelId, string> = { G: "1", L1: "2", L2: "3" };
const KEY_LEVELS: Record<string, LevelId> = Object.fromEntries(Object.entries(LEVEL_KEYS).map(([level, key]) => [key, level as LevelId]));

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Map keyboard shortcuts: 1 / 2 / 3 open a floor (G / L1 / L2), "/" opens Search,
 * Escape or A closes an open area card or, with none open, returns to the
 * stacked start view ("all floors"; A is deliberately not advertised). Listens on window while the Map pane is
 * the visible one (every visited pane stays mounted), and stands down while
 * the user types in a field, holds a modifier, has Find or Search open (they own Escape)
 * or has a detail view open over the map (DetailLayer owns Escape there).
 */
export function useMapShortcuts({ showLevel, reset, openSearch, closeCard }: Handlers, { enabled, hasCard }: { enabled: boolean; hasCard: boolean }) {
  const active = usePaneActive();
  const detail = useDetailView().kind !== null;

  // The handlers are stable useCallbacks in VenueMap3D, so the listener only re-binds on the gates.
  useEffect(() => {
    if (!active || !enabled || detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      if (e.key === "Escape" || key === "a") {
        if (hasCard) closeCard();
        else reset();
        return;
      }
      if (e.key === "/") {
        e.preventDefault(); // Search focuses its field on open; the slash must not land in it (nor open Firefox quick find)
        openSearch();
        return;
      }
      const level = KEY_LEVELS[key];
      if (level) showLevel(level);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, enabled, detail, hasCard, showLevel, reset, openSearch, closeCard]);
}
