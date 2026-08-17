"use client";

import { useEvent } from "@/data/hooks";
import type { Session } from "@/data/models";
import { useNowMs } from "@/hooks/useNow";
import { getStatus, streamUrlForDay } from "@/components/schedule/utils";

/**
 * Recording / livestream for a session:
 * - recording available (YouTube, else StreamEth) -> embed it
 * - no recording, session live or starting within the hour -> embed the
 *   room's stream for that conference day
 * - while live or imminent and room has translationUrl -> render "Live translation
 *   available" link (with or without an embed)
 * - otherwise render nothing (no dead placeholder boxes when neither embed nor
 *   translation link is available)
 */
export function SessionMedia({ session }: { session: Session }) {
  const nowMs = useNowMs(30_000);
  const { event } = useEvent();

  const recordingSrc = session.sources_youtubeId
    ? `https://www.youtube.com/embed/${session.sources_youtubeId}`
    : session.sources_streamethId
      ? `https://streameth.org/embed/?session=${session.sources_streamethId}&vod=true`
      : null;

  const status = session.room ? getStatus(session, nowMs) : null;
  const isLiveish = status === "live" || status === "soon";
  const translationUrl = isLiveish ? (session.room?.translationUrl ?? null) : null;

  let streamSrc: string | null = null;
  if (!recordingSrc && session.room && isLiveish) {
    streamSrc = streamUrlForDay(session.room, session.start * 1000, event?.startDate);
  }

  const src = recordingSrc ?? streamSrc;
  if (!src && !translationUrl) return null;

  return (
    // No own margins — the details layout's gaps own the spacing around media.
    <div>
      {streamSrc && (
        <p className="mb-1 text-sm font-semibold text-dc-red">Livestream</p>
      )}
      {src && (
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
      )}
      {translationUrl && (
        <a
          href={translationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-dc-purple underline"
        >
          Live translation available
        </a>
      )}
    </div>
  );
}
