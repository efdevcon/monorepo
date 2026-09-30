"use client";

import { CloudOff } from "lucide-react";
import cn from "classnames";
import { useOnline } from "@/hooks/useOnline";
import { useSyncStatus } from "@/data/hooks";

/**
 * Offline status pill in the app header: orange icon + "Offline" on a soft
 * orange fill, no border (a bordered white circle read as a button), with
 * the full state ("Offline, schedule from HH:MM") in the tooltip and for
 * screen readers. The offline experience is otherwise seamless (every list and
 * detail renders from the store), so without a marker there is no way to tell
 * you're looking at saved data, or why Q&A and streams aren't loading.
 *
 * Inline in AppHeader rather than a floating overlay: a fixed pill collided
 * with the sticky header's title. `useOnline` is `true` until hydration, so
 * the first client paint matches the server HTML.
 */
export function OfflineIndicator({
  iconOnly = false,
}: {
  /** Toolbar rows (mobile schedule, speakers) have no room for the label:
   *  the pill keeps its fill and icon, the words stay in the tooltip. */
  iconOnly?: boolean;
}) {
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
      className={cn(
        "flex h-8 shrink-0 select-none items-center gap-1.5 rounded-full bg-dc-offline-bg font-heading text-[14px] font-medium leading-none text-dc-offline",
        iconOnly ? "w-8 justify-center" : "px-3"
      )}
    >
      <CloudOff className="size-4" aria-hidden />
      {!iconOnly && <span aria-hidden>Offline</span>}
    </span>
  );
}
