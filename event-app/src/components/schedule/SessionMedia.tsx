"use client";

import { useEvent } from "@/data/hooks";
import type { Session } from "@/data/models";
import { useNowMs } from "@/hooks/useNow";
import { getStatus } from "@/components/schedule/utils";

const DAY_MS = 86_400_000;

const STREAM_FIELDS = [
  "youtubeStreamUrl_1",
  "youtubeStreamUrl_2",
  "youtubeStreamUrl_3",
  "youtubeStreamUrl_4",
] as const;

/**
 * 1-based conference day for a session, anchored on the event's startDate
 * (UTC calendar days). Returns null when the event dates are unknown or the
 * session falls outside the covered range.
 */
function eventDayIndex(
  sessionStartMs: number,
  eventStartIso?: string
): number | null {
  if (!eventStartIso) return null;
  const eventStartMs = Date.parse(eventStartIso);
  if (Number.isNaN(eventStartMs)) return null;
  const index =
    Math.floor(sessionStartMs / DAY_MS) - Math.floor(eventStartMs / DAY_MS) + 1;
  return index >= 1 && index <= STREAM_FIELDS.length ? index : null;
}

/**
 * Recording / livestream for a session:
 * - recording available (YouTube, else StreamEth) -> embed it
 * - no recording, session live or starting within the hour -> embed the
 *   room's stream for that conference day
 * - otherwise render nothing (no dead placeholder boxes)
 */
export function SessionMedia({ session }: { session: Session }) {
  const nowMs = useNowMs(30_000);
  const { event } = useEvent();

  const recordingSrc = session.sources_youtubeId
    ? `https://www.youtube.com/embed/${session.sources_youtubeId}`
    : session.sources_streamethId
      ? `https://streameth.org/embed/?session=${session.sources_streamethId}&vod=true`
      : null;

  let streamSrc: string | null = null;
  if (!recordingSrc && session.room) {
    const status = getStatus(session, nowMs);
    if (status === "live" || status === "soon") {
      const day = eventDayIndex(session.start * 1000, event?.startDate);
      if (day) streamSrc = session.room[STREAM_FIELDS[day - 1]] ?? null;
    }
  }

  const src = recordingSrc ?? streamSrc;
  if (!src) return null;

  return (
    <div className="mb-4">
      {streamSrc && (
        <p className="mb-1 text-sm font-semibold text-red-600">Livestream</p>
      )}
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={src}
          title={session.title}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}
