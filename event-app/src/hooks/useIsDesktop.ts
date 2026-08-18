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
