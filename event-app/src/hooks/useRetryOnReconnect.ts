"use client";

import { useCallback, useEffect, useState } from "react";
import { isOnlineNow, subscribeOnline } from "./useOnline";

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
 * Only failed components subscribe, through the shared connectivity
 * subscription in useOnline.ts (one window listener for the whole app).
 */
export function useRetryOnReconnect() {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const markFailed = useCallback(() => setFailed(true), []);

  useEffect(() => {
    if (!failed) return;
    return subscribeOnline(() => {
      if (!isOnlineNow()) return;
      setFailed(false);
      setAttempt((n) => n + 1);
    });
  }, [failed]);

  return { failed, attempt, markFailed };
}
