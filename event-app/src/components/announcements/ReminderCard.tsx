"use client";

import { MapPin } from "lucide-react";
import { Link } from "@/routing";
import { useNowMs } from "@/hooks/useNow";
import { useSession } from "@/data/hooks";
import { SessionCard } from "@/components/schedule/SessionCard";
import { formatTime } from "@/components/schedule/utils";
import { mapHrefForRoom } from "@/app/(page-layout)/map/venue-map-3d/roomAreas";
import {
  REMINDER_LEAD_MINUTES,
  type ReminderItem,
} from "@/data/reminders/reminders";
import { relativeTime } from "@/utils/relativeTime";
import { UnreadDot } from "./AnnouncementCard";

const ctaClass =
  "inline-flex items-center gap-1 rounded font-heading text-sm font-bold text-dc-purple underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple";

/**
 * One Personal-tab item: the inbox card's shell — generic title with the
 * unread dot and a relative time, the reminder's one-line message as it was
 * sent — with the schedule's own SessionCard embedded (title, time, room,
 * format, speakers, track and the star — it opens the session itself), plus
 * a link to its spot on the map (`/map` when the room isn't mapped yet). The
 * outer card is not a link: the embedded card and the map CTA are the
 * targets. The message is a record of the reminder, like a sent
 * announcement, so it keeps saying "in 15 minutes" after the fact.
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
  // From the EventStore snapshot (no fetch); the reminder was derived from
  // this same catalogue, so it is only ever missing mid-resync.
  const { session } = useSession(sessionId);

  return (
    <div className="rounded-lg border border-dc-hairline bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 font-heading text-base font-bold leading-6 text-dc-fg2">
          Session reminder
        </p>
        <span className="flex shrink-0 items-center gap-2">
          {!seen && <UnreadDot />}
          <span className="font-heading text-xs leading-4 text-dc-muted">
            {relativeTime(remindAtMs, nowMs)}
          </span>
        </span>
      </div>
      <p className="mt-2 font-heading text-sm leading-5 text-dc-fg2">
        Your interested session starts in {REMINDER_LEAD_MINUTES} minutes.
      </p>
      <div className="mt-3">
        {session ? (
          <SessionCard session={session} />
        ) : (
          <p className="font-heading text-sm leading-5 text-dc-fg2">
            {title} · {formatTime(startMs / 1000)}
            {roomName ? ` · ${roomName}` : ""}
          </p>
        )}
      </div>
      <div className="mt-4">
        <Link href={mapHrefForRoom(roomId)} className={ctaClass}>
          <MapPin className="size-4" /> Show on map
        </Link>
      </div>
    </div>
  );
}
