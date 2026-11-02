"use client";

import { useEffect } from "react";
import APP_CONFIG from "@/CONFIG";
import { trackEvent } from "@/data/analytics/track";
import { canReloadForChunkError, isChunkLoadError, reloadForChunkError } from "@/utils/chunkError";

/** How long a broken room screen shows its message before reloading itself. */
const RETRY_MS = 30_000;

/**
 * Error boundary of the room screens (picker and kiosks). An unattended TV
 * cannot click "Try again", so the page reloads itself after 30 s while
 * online, and retries the render offline (the picker shell is precached and a
 * kiosk path comes back from it, so the online check only avoids a reload
 * storm on a dead network). Deep purple like the kiosk's own messages.
 */
export default function RoomScreensError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Build skew (a chunk of an older build is gone): straight onto the new build.
    if (isChunkLoadError(error) && canReloadForChunkError()) {
      trackEvent("error", "stale-chunk", window.location.pathname);
      reloadForChunkError();
      return;
    }
    console.error("Room screen error:", error);
    trackEvent("error", "page", window.location.pathname);
    if (!APP_CONFIG.KIOSK_AUTO_UPDATE) return;
    const timer = window.setTimeout(() => {
      if (navigator.onLine) window.location.reload();
      else reset();
    }, RETRY_MS);
    return () => window.clearTimeout(timer);
  }, [error, reset]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center font-heading text-white"
      style={{ backgroundColor: "#221144" }}
    >
      <p className="text-[2vw]">Something went wrong. The screen reloads itself in a moment.</p>
    </div>
  );
}
