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

/**
 * Dev preview (outside production): `?previewOffline=1` makes every
 * `useOnline()` consumer render its offline state (header pill, "needs a
 * connection" lines) without touching the network; the data layer still
 * sees the real connection. Kept in sessionStorage so it survives in-app
 * navigation for the tab; `?previewOffline=0` clears it. Read once per page
 * load.
 */
const PREVIEW_OFFLINE_KEY = "previewOffline";
let previewOffline: boolean | null = null;
function isPreviewOffline(): boolean {
  if (previewOffline !== null) return previewOffline;
  previewOffline = false;
  if (process.env.NODE_ENV === "production") return previewOffline;
  try {
    const v = new URLSearchParams(window.location.search).get(PREVIEW_OFFLINE_KEY);
    if (v === "1") sessionStorage.setItem(PREVIEW_OFFLINE_KEY, "1");
    else if (v === "0") sessionStorage.removeItem(PREVIEW_OFFLINE_KEY);
    previewOffline = sessionStorage.getItem(PREVIEW_OFFLINE_KEY) === "1";
  } catch {
    // Storage blocked: the preview is simply off.
  }
  return previewOffline;
}

const onlineSnapshot = () => isOnlineNow() && !isPreviewOffline();

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, onlineSnapshot, () => true);
}
