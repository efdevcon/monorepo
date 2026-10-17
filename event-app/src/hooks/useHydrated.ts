"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * `false` on the server and during hydration, `true` on every client render
 * after it. For values that read the browser (window.location, carried URL
 * params) and so must not differ between the server HTML and the first
 * client render. No effect and no setState, so nothing re-renders twice.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}
