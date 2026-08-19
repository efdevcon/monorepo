"use client";

import { useEffect, useState } from "react";

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

/**
 * App-header heights (px) — the sticky offsets every pinned row and scroll
 * measurement hangs off. Tailwind classes can't consume these, so the
 * matching `top-14` / `lg:top-[65px]` (and derived scroll-mt) classes across
 * schedule/speakers must move in lockstep if these ever change.
 */
export const HEADER_OFFSET_MOBILE = 56;
export const HEADER_OFFSET_DESKTOP = 65;

/** The current breakpoint's header offset, for scroll-position math. */
export function headerOffsetNow(): number {
  return isDesktopNow() ? HEADER_OFFSET_DESKTOP : HEADER_OFFSET_MOBILE;
}
