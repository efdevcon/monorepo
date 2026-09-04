"use client";

import { CloudOff } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";
import { useSyncStatus } from "@/data/hooks";

/**
 * Minimal offline marker in the app header: the icon alone, with the full
 * state ("Offline, schedule from HH:MM") in the tooltip and for screen
 * readers. The offline experience is otherwise seamless (every list and
 * detail renders from the store), so without a marker there is no way to tell
 * you're looking at saved data, or why Q&A and streams aren't loading.
 *
 * Inline in AppHeader rather than a floating overlay: a fixed pill collided
 * with the sticky header's title. `useOnline` is `true` until hydration, so
 * the first client paint matches the server HTML.
 */
export function OfflineIndicator() {
  const online = useOnline();
  const { syncedAt } = useSyncStatus();
  if (online) return null;

  // A stored timestamp (not "now"): the viewer's local clock is the right
  // frame for "when did my phone last sync".
  const since = syncedAt
    ? new Date(syncedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const label = since ? `Offline, schedule from ${since}` : "Offline";

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      title={label}
      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dc-hairline bg-white text-dc-purple"
    >
      <CloudOff className="size-3.5" aria-hidden />
    </span>
  );
}
