"use client";

import { CalendarX2, UserX } from "lucide-react";
import { FAILED_BODY, StateMessage, TryAgainButton } from "./StateMessage";
import { isOnlineNow } from "@/hooks/useOnline";
import { ListSkeleton } from "./Skeletons";

type Kind = "schedule" | "speakers";

const COPY: Record<Kind, { loading: string; unpublished: string; failed: string; offline: string }> = {
  schedule: {
    loading: "Loading schedule…",
    unpublished: "The schedule isn't published yet. Check back soon.",
    failed: "Couldn't load the schedule",
    offline: "You're offline and the schedule isn't saved on this device yet.",
  },
  speakers: {
    loading: "Loading speakers…",
    unpublished: "Speakers aren't announced yet. Check back soon.",
    failed: "Couldn't load the speakers",
    offline: "You're offline and the speakers aren't saved on this device yet.",
  },
};

/**
 * The three non-list states of a catalogue list, in plain words:
 * - loading: nothing has ever been synced and a sync is pending (skeleton rows);
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
  const copy = COPY[kind];

  if (state === "loading") {
    return <ListSkeleton kind={kind} label={copy.loading} />;
  }
  if (state === "unpublished") {
    return <p className="py-12 text-center text-dc-muted">{copy.unpublished}</p>;
  }

  const offline = !isOnlineNow();
  // Nothing else is on screen below the toolbars, so the message sits in
  // the middle of the viewport rather than at the top of the empty list:
  // the min-height is roughly the viewport less the header, toolbars and
  // (phones) the tab bar above and below it.
  return (
    <StateMessage
      icon={kind === "schedule" ? CalendarX2 : UserX}
      title={copy.failed}
      body={offline ? copy.offline : FAILED_BODY}
      className="min-h-[calc(100dvh-360px)] py-8 lg:min-h-[calc(100dvh-600px)]"
    >
      <TryAgainButton />
    </StateMessage>
  );
}
