"use client";

import { useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { forceSync } from "@/data/hooks/use-sessions";
import { isOnlineNow } from "@/hooks/useOnline";

type Kind = "schedule" | "speakers";

const COPY: Record<Kind, { loading: string; unpublished: string; failed: string; offline: string }> = {
  schedule: {
    loading: "Loading schedule…",
    unpublished: "The schedule isn't published yet. Check back soon.",
    failed: "Couldn't load the schedule.",
    offline: "You're offline and the schedule isn't saved on this device yet.",
  },
  speakers: {
    loading: "Loading speakers…",
    unpublished: "Speakers aren't announced yet. Check back soon.",
    failed: "Couldn't load the speakers.",
    offline: "You're offline and the speakers aren't saved on this device yet.",
  },
};

/**
 * The three non-list states of a catalogue list, in plain words:
 * - loading: nothing has ever been synced and a sync is pending;
 * - unpublished: the event synced fine but has no items yet (the app can ship
 *   before the schedule does; this is not "no results" and not an error);
 * - error: the first sync failed, with a Retry. The raw error stays in the
 *   debug panel; users never see exception text or URLs.
 */
export function ListLoadState({
  kind,
  state,
}: {
  kind: Kind;
  state: "loading" | "unpublished" | "error";
}) {
  const [retrying, setRetrying] = useState(false);
  const copy = COPY[kind];

  if (state === "loading") {
    return <p className="py-12 text-center text-dc-muted">{copy.loading}</p>;
  }
  if (state === "unpublished") {
    return <p className="py-12 text-center text-dc-muted">{copy.unpublished}</p>;
  }

  const offline = !isOnlineNow();
  const retry = async () => {
    setRetrying(true);
    try {
      await forceSync();
    } finally {
      setRetrying(false);
    }
  };
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="flex items-center gap-2 text-dc-muted">
        {offline && <CloudOff className="size-4 shrink-0 text-dc-purple" />}
        {offline ? copy.offline : copy.failed}
      </p>
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="flex cursor-pointer items-center gap-1.5 font-bold text-dc-purple hover:underline disabled:opacity-50"
      >
        <RefreshCw className={retrying ? "size-4 animate-spin" : "size-4"} />
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
