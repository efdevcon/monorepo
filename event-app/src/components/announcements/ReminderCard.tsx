"use client";

import cn from "classnames";
import { MapPin, PlayCircle } from "lucide-react";
import { Link } from "@/routing";
import { DetailLink } from "@/routing/DetailLink";
import { useNowMs } from "@/hooks/useNow";
import { useSession } from "@/data/hooks";
import { SessionCard } from "@/components/schedule/SessionCard";
import { SpeakerSessionMiniCard } from "@/components/speakers/SpeakerSessionMiniCard";
import { formatTime } from "@/components/schedule/utils";
import { mapHrefForRoom } from "@/app/(page-layout)/map/venue-map-3d/roomAreas";
import {
  REMINDER_LEAD_MINUTES,
  type ReminderItem,
} from "@/data/reminders/reminders";
import { relativeTime } from "@/utils/relativeTime";
import { InboxKindRow } from "./AnnouncementCard";

const ctaClass =
  "inline-flex items-center gap-1 rounded font-heading font-bold text-dc-purple underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-purple";

/**
 * One session reminder in the inbox, in the same two shapes as
 * AnnouncementCard. Lavender fill (announcements are white) and the
 * "Session reminder" InboxKindRow tell the two kinds apart in the merged
 * list; no rail of its own (the embedded session card already has the
 * track-coloured one) and never a purple border, which on lavender is the
 * SessionCard's selected state.
 * - "inbox" (default, /announcements): kind row (unread dot, relative time),
 *   the reminder itself as the title line ("Interested session starts in N minutes"),
 *   the schedule's own SessionCard (title, time, room, format, speakers,
 *   track and the star — it opens the session itself), then one CTA: "Show
 *   on map" (`/map` when the room isn't mapped yet) while the session is
 *   ahead or live, "Watch recording" (the session page, where SessionMedia
 *   embeds it) once it has ended — the map is no longer useful then.
 * - "home" (home preview grid): same content with the compact speaker-panel
 *   session card and the CTA bottom-right, equal-height across the 3-up grid.
 * The outer card is never a link: the embedded card and the CTA are the
 * targets. The message is a record of the reminder, like a sent
 * announcement, so it keeps saying "in REMINDER_LEAD_MINUTES minutes" after
 * the fact.
 */
export function ReminderCard({
  reminder,
  seen,
  variant = "inbox",
}: {
  reminder: ReminderItem;
  seen: boolean;
  variant?: "inbox" | "home";
}) {
  // Event clock: reminders are dated against the schedule (mockable).
  const nowMs = useNowMs(60_000);
  const { sessionId, title, roomId, roomName, startMs, remindAtMs } = reminder;
  // From the EventStore snapshot (no fetch); the reminder was derived from
  // this same catalogue, so it is only ever missing mid-resync.
  const { session } = useSession(sessionId);
  const time = relativeTime(remindAtMs, nowMs);
  const kindRow = (
    <InboxKindRow
      label="Session reminder"
      time={time}
      seen={seen}
    />
  );
  const message = `Interested session starts in ${REMINDER_LEAD_MINUTES} minutes`;
  // Session.end is unix seconds. Unknown session → not provably finished.
  const finished = session ? nowMs >= session.end * 1000 : false;

  const cta = (mini: boolean) => {
    const cls = cn(ctaClass, mini ? "text-xs" : "text-sm");
    const icon = mini ? "size-3.5" : "size-4";
    return finished ? (
      <DetailLink kind="session" id={sessionId} className={cls}>
        <PlayCircle className={icon} /> Watch recording
      </DetailLink>
    ) : (
      <Link href={mapHrefForRoom(roomId)} className={cls}>
        <MapPin className={icon} /> Show on map
      </Link>
    );
  };

  const fallback = (
    <p className="font-heading text-sm leading-5 text-dc-fg2">
      {title} · {formatTime(startMs / 1000)}
      {roomName ? ` · ${roomName}` : ""}
    </p>
  );

  if (variant === "home") {
    return (
      <div className="flex h-full flex-col justify-between gap-3 rounded-lg border border-dc-hairline bg-dc-lavender p-4">
        <div>
          {kindRow}
          <p className="mt-2 font-heading text-sm font-bold leading-5 text-dc-fg2">
            {message}
          </p>
          <div className="mt-3">
            {session ? <SpeakerSessionMiniCard session={session} /> : fallback}
          </div>
        </div>
        <div className="flex justify-end">{cta(true)}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dc-hairline bg-dc-lavender p-4">
      {kindRow}
      <p className="mt-2 font-heading text-base font-bold leading-6 text-dc-fg2">
        {message}
      </p>
      <div className="mt-3">
        {session ? <SessionCard session={session} /> : fallback}
      </div>
      <div className="mt-4">{cta(false)}</div>
    </div>
  );
}
