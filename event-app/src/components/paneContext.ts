"use client";

import { createContext, useContext, useEffect, useRef, type MouseEvent } from "react";
import { isTabPath, VIEW_PARAMS } from "@/routing/viewParams";

/**
 * Whether the enclosing persistent tab pane (see TabPanes.tsx) is the visible
 * one. Defaults to true outside any pane. Anything that portals into the app
 * header or measures the window on scroll must check this: every visited pane
 * stays mounted, so without the gate all of them would inject their header
 * buttons and re-measure on every scroll of another tab.
 */
export const PaneActiveContext = createContext(true);

export function usePaneActive(): boolean {
  return useContext(PaneActiveContext);
}

/** The route path of the enclosing pane, or null outside any pane. */
export const PanePathContext = createContext<string | null>(null);

// ---------------------------------------------------------------------------
// Re-tapping the active tab (native tab-bar behaviour): the pane resets to its
// initial state. Default is a smooth scroll to the top; a pane registers its
// own reset when "initial" means something else (the schedule jumps to "now").
// ---------------------------------------------------------------------------

const reselectHandlers = new Map<string, () => void>();

export function emitTabReselect(path: string): void {
  const handler = reselectHandlers.get(path);
  if (handler) handler();
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Register what "reset to initial state" means for the enclosing pane. */
export function useTabReselect(handler: () => void): void {
  const path = useContext(PanePathContext);
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  }, [handler]);
  useEffect(() => {
    if (!path) return;
    const run = () => latest.current();
    reselectHandlers.set(path, run);
    return () => {
      if (reselectHandlers.get(path) === run) reselectHandlers.delete(path);
    };
  }, [path]);
}

/**
 * Tab link click handler. Tapping the tab you are already on resets the pane
 * instead of navigating, unless a detail view is open: then the normal
 * navigation to the bare tab URL is what closes it.
 */
export function handleTabClick(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string
): void {
  if (!isTabPath(href) || pathname !== href) return;
  const params = new URLSearchParams(window.location.search);
  if (VIEW_PARAMS.some((p) => params.has(p))) return;
  event.preventDefault();
  emitTabReselect(href);
}
