"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Single source for the JS-side desktop breakpoint. Must mirror Tailwind's
 * `lg:` (1024px) — the schedule's layout forks on it in both CSS and JS, so
 * a hand-written matchMedia string that drifts from `lg:` splits the UI.
 */
export const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
/** Complement of DESKTOP_MEDIA_QUERY — keep the two in lockstep. */
export const MOBILE_MEDIA_QUERY = "(max-width: 1023px)";

/** Reactive media-query state; `false` until hydration (SSR-safe). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_MEDIA_QUERY);
}

/** One-shot check for event handlers (no reactivity needed). */
export function isDesktopNow(): boolean {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

export const LANDSCAPE_MEDIA_QUERY = "(orientation: landscape)";

/**
 * A phone held sideways. Must mirror the `phone-landscape:` variant in
 * globals.css — the schedule forks its chrome on it in both CSS and JS.
 */
export const PHONE_LANDSCAPE_MEDIA_QUERY =
  "(max-width: 1023px) and (orientation: landscape) and (max-height: 600px)";

export function useIsPhoneLandscape(): boolean {
  return useMediaQuery(PHONE_LANDSCAPE_MEDIA_QUERY);
}

/** Viewport wider than tall; `false` until hydration (SSR-safe). */
export function useIsLandscape(): boolean {
  return useMediaQuery(LANDSCAPE_MEDIA_QUERY);
}

/**
 * Runs `onChange` when the device rotates (the landscape media query flips) —
 * on changes only, never on mount, so a consumer can hold state that a
 * rotation resets without a mount-time effect wiping a restored value.
 */
export function useOrientationChange(onChange: () => void): void {
  const cbRef = useRef(onChange);
  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const mq = window.matchMedia(LANDSCAPE_MEDIA_QUERY);
    const handle = () => cbRef.current();
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);
}

/**
 * App-header heights (px) — the sticky offsets every pinned row and scroll
 * measurement hangs off. Tailwind classes can't consume these, so the
 * matching `top-[calc(3.5rem+var(--safe-top))]` / lg 65px (and derived
 * scroll-mt) classes across schedule/speakers must move in lockstep if these
 * ever change. They exclude the iOS status-bar inset — use headerOffsetNow()
 * (which adds safeTopNow()) for anything measured against the viewport.
 */
export const HEADER_OFFSET_MOBILE = 56;
export const HEADER_OFFSET_DESKTOP = 65;

/**
 * JS mirror of the --safe-top CSS variable (globals.css): the iOS status-bar
 * inset the header grows by in the installed PWA, 0 everywhere else.
 *
 * Cached: headerOffsetNow() is called from per-scroll-frame rAF measure
 * loops (DayTabs' stuck check, the speakers rail/scrollspy), where a
 * getComputedStyle(document.documentElement) per frame forces a style
 * recalc across the whole page — on the ~82k-px speakers list that is the
 * exact workload that used to kill the iOS content process. The inset only
 * changes with viewport geometry, so the cache invalidates on resize /
 * orientationchange and re-reads lazily.
 */
let safeTopCache: number | null = null;
let safeLeftCache: number | null = null;
if (typeof window !== "undefined") {
  const invalidate = () => {
    safeTopCache = null;
    safeLeftCache = null;
  };
  window.addEventListener("resize", invalidate);
  window.addEventListener("orientationchange", invalidate);
}

const readRootPx = (name: string): number =>
  parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name)
  ) || 0;

export function safeTopNow(): number {
  if (safeTopCache === null) safeTopCache = readRootPx("--safe-top");
  return safeTopCache;
}

/** JS mirror of --safe-left: the notch's width when it sits on the left in landscape, else 0. */
export function safeLeftNow(): number {
  if (safeLeftCache === null) safeLeftCache = readRootPx("--safe-left");
  return safeLeftCache;
}

/**
 * Set on <html> by the schedule while a phone in landscape shows the list:
 * the mobile app-header row is display:none (AppHeader.tsx), so every
 * offset measured from the header's bottom edge starts at the status-bar
 * inset instead. Distinct from `data-app-header-hidden`, the timeline's
 * animated fold, which keeps the row in flow.
 */
export const APP_HEADER_OFF_ATTR = "data-app-header-off";

/** The current breakpoint's header offset, for scroll-position math. */
export function headerOffsetNow(): number {
  if (document.documentElement.hasAttribute(APP_HEADER_OFF_ATTR)) {
    return safeTopNow();
  }
  return (
    (isDesktopNow() ? HEADER_OFFSET_DESKTOP : HEADER_OFFSET_MOBILE) +
    safeTopNow()
  );
}
