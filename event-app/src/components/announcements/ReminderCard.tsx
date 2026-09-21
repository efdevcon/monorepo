"use client";

import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "@/routing";
import { DetailLink } from "@/routing/DetailLink";
import { useNowMs } from "@/hooks/useNow";
import { formatTime } from "@/components/schedule/utils";
import { mapHrefForRoom } from "@/app/(page-layout)/map/venue-map-3d/roomAreas";
import type { ReminderItem } from "@/data/reminders/reminders";
import { relativeTime } from "@/utils/relativeTime";
import { UnreadDot } from "./AnnouncementCard";

const ctaClass =
  "inline-flex items-center gap-1 rounded font-heading text-sm font-bold text-dc-purple underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple";

/**
 * One Personal-tab item ("your starred session starts soon"): the inbox
 * card's shell — title row with the unread dot and a relative time, one line
 * of when/where — plus two links: the session page (opens in place, like a
 * schedule card) and its spot on the map (`/map` when the room isn't mapped
 * yet). Two targets, so the card itself is not a link.
 */
export function ReminderCard({
  reminder,
  seen,
}: {
  reminder: ReminderItem;
  seen: boolean;
}) {
  // Event clock: reminders are dated against the schedule (mockable).
  const nowMs = useNowMs(60_000);
  const { sessionId, title, roomId, roomName, startMs, remindAtMs } = reminder;
  const started = nowMs >= startMs;

  return (
    <div className="rounded-lg border border-dc-hairline bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 font-heading text-base font-bold leading-6 text-dc-fg2">
          {title}
        </p>
        <span className="flex shrink-0 items-center gap-2">
          {!seen && <UnreadDot />}
          <span className="font-heading text-xs leading-4 text-dc-muted">
            {relativeTime(remindAtMs, nowMs)}
          </span>
        </span>
      </div>
      <p className="mt-2 font-heading text-sm leading-5 text-dc-fg2">
        {started ? "Started" : "Starts"} {formatTime(startMs / 1000)}
        {" · "}
        {roomName ?? "TBA"}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <DetailLink kind="session" id={sessionId} className={ctaClass}>
          Open session <ArrowRight className="size-4" />
        </DetailLink>
        <Link href={mapHrefForRoom(roomId)} className={ctaClass}>
          <MapPin className="size-4" /> Show on map
        </Link>
      </div>
    </div>
  );
}
