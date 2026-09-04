"use client";

import { useSyncExternalStore } from "react";

/**
 * Single source of truth for connectivity. One pair of window listeners feeds
 * every subscriber (hundreds of avatars may subscribe), and `useOnline` reads
 * it tear-free via useSyncExternalStore. `true` on the server and during
 * hydration so the first client render matches the HTML.
 */
const subscribers = new Set<() => void>();
let listening = false;

function notify() {
  for (const cb of [...subscribers]) cb();
}

export function subscribeOnline(cb: () => void): () => void {
  if (!listening && typeof window !== "undefined") {
    listening = true;
    window.addEventListener("online", notify);
    window.addEventListener("offline", notify);
  }
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function isOnlineNow(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, isOnlineNow, () => true);
}
