"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Retry a failed image (or any resource) once the connection is back.
 *
 * An `<img>` that fails while offline stays broken for the life of the page:
 * nothing re-requests it, so reconnecting doesn't repair the view. This gives a
 * component a `failed` flag to render a fallback from, plus an `attempt` counter
 * to use as a `key` so a reconnect forces a fresh load of the *same* URL.
 *
 * Deliberately not a cache-busting query param: that would change the URL, miss
 * the service worker's cached copy, and pile up duplicate cache entries.
 *
 * One shared `online` listener for the whole app, and only failed components
 * subscribe — with ~700 avatars on screen, a listener each would be wasteful.
 */

const subscribers = new Set<() => void>();
let listening = false;

function ensureListener(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("online", () => {
    // Copy first: a callback may unsubscribe while we iterate.
    for (const notify of [...subscribers]) notify();
  });
}

export function useRetryOnReconnect() {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const markFailed = useCallback(() => setFailed(true), []);

  useEffect(() => {
    if (!failed) return;
    ensureListener();
    const retry = () => {
      setFailed(false);
      setAttempt((n) => n + 1);
    };
    subscribers.add(retry);
    return () => {
      subscribers.delete(retry);
    };
  }, [failed]);

  return { failed, attempt, markFailed };
}
