"use client";

import { CalendarClock, CalendarX2, UserX, UsersRound } from "lucide-react";
import { FAILED_BODY, LIST_SLOT_CENTER, StateMessage, TryAgainButton } from "./StateMessage";
import { useOnline } from "@/hooks/useOnline";
import { NeedsConnection } from "./NeedsConnection";
import { ListSkeleton } from "./Skeletons";

type Kind = "schedule" | "speakers";

const COPY: Record<Kind, { loading: string; unpublishedTitle: string; unpublished: string; failed: string; offline: string; retry: string }> = {
  schedule: {
    loading: "Loading schedule…",
    unpublishedTitle: "Schedule coming soon",
    unpublished: "The schedule isn't published yet. Check back soon.",
    failed: "Couldn't load the schedule",
    offline: "You're offline and the schedule isn't saved on this device yet.",
    retry: "Loading the schedule",
  },
  speakers: {
    loading: "Loading speakers…",
    unpublishedTitle: "Speakers coming soon",
    unpublished: "Speakers aren't announced yet. Check back soon.",
    failed: "Couldn't load the speakers",
    offline: "You're offline and the speakers aren't saved on this device yet.",
    retry: "Loading the speakers",
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
  // Subscribed, so the copy and action flip back when the network returns
  // (SWR refetches on reconnect by itself).
  const online = useOnline();

  if (state === "loading") {
    return <ListSkeleton kind={kind} label={copy.loading} />;
  }
  if (state === "unpublished") {
    // Nothing to retry, so no action.
    return (
      <StateMessage
        icon={kind === "schedule" ? CalendarClock : UsersRound}
        title={copy.unpublishedTitle}
        body={copy.unpublished}
        className={LIST_SLOT_CENTER}
      />
    );
  }

  // Nothing else is on screen below the toolbars, so the message sits in
  // the middle of the viewport rather than at the top of the empty list.
  return (
    <StateMessage
      icon={kind === "schedule" ? CalendarX2 : UserX}
      title={copy.failed}
      body={online ? FAILED_BODY : copy.offline}
      tone="critical"
      className={LIST_SLOT_CENTER}
    >
      {/* A retry can only fail offline, so no dead button. */}
      {online ? <TryAgainButton /> : <NeedsConnection what={copy.retry} className="self-center" />}
    </StateMessage>
  );
}
