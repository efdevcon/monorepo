"use client";

import { useEffect } from "react";
import { usePaneActive } from "@/components/paneContext";
import { useDetailView } from "@/routing/detailRoute";
import { LEVEL_KEYS, type LevelId } from "../data/levels";

const KEY_LEVELS: Record<string, LevelId> = Object.fromEntries(Object.entries(LEVEL_KEYS).map(([level, key]) => [key, level as LevelId]));

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

type Handlers = { showLevel: (level: LevelId) => void; reset: () => void; openFind: () => void; openSearch: () => void; closeCard: () => void };

/**
 * Map keyboard shortcuts: digits open a floor, F opens Find, "/" opens
 * Search, Escape or A closes an open area card or, with none open, resets
 * the view (A is deliberately unadvertised). Live while the Map pane is the
 * visible one, and stands down while typing, with a modifier held, with a
 * panel open (it owns Escape) or a detail view over the map.
 */
export function useMapShortcuts({ showLevel, reset, openFind, openSearch, closeCard }: Handlers, { enabled, hasCard }: { enabled: boolean; hasCard: boolean }) {
  const active = usePaneActive();
  const detail = useDetailView().kind !== null;
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
        e.preventDefault();
        openSearch();
        return;
      }
      if (key === "f") {
        openFind();
        return;
      }
      const level = KEY_LEVELS[key];
      if (level) showLevel(level);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, enabled, detail, hasCard, showLevel, reset, openFind, openSearch, closeCard]);
}
