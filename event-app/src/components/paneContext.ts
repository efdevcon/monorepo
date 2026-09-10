"use client";

import { createContext, useContext, useEffect, useRef, type MouseEvent } from "react";
import { isTabPath } from "@/routing/viewParams";
import { tapHaptic } from "@/utils/haptics";

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
// initial state. Default is an instant scroll to the top; a pane registers its
// own reset when "initial" means something else (the schedule jumps to "now").
// Instant, never smooth: a smooth scroll from the bottom of the speakers list
// animates through ~90 viewports and WebKit rasterises everything it passes
// (PR #112 crash class). Teleporting is also what native tab bars do.
// ---------------------------------------------------------------------------

const reselectHandlers = new Map<string, () => void>();

export function emitTabReselect(path: string): void {
  const handler = reselectHandlers.get(path);
  if (handler) handler();
  else window.scrollTo({ top: 0, behavior: "auto" });
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
 * Tab link click handler. Every tab tap gives a haptic tick where the platform
 * allows it (see utils/haptics.ts). Tapping the tab you are already on resets
 * the pane instead of navigating. With a detail page open the pathname is
 * `/schedule/<id>`, not the tab's, so the normal navigation to the bare tab
 * URL runs and is what closes the detail.
 */
export function handleTabClick(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string
): void {
  if (!isTabPath(href)) return;
  tapHaptic();
  if (pathname !== href) return;
  event.preventDefault();
  emitTabReselect(href);
}
