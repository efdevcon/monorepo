"use client";

import { useEffect, useRef, useState } from "react";
import { useEvent } from "@/data/hooks";
import { DESKTOP_MEDIA_QUERY } from "@/hooks/useIsDesktop";
import type { Session } from "@/data/models";
import { useOnline } from "@/hooks/useOnline";
import { NeedsConnection } from "@/components/NeedsConnection";
import { streamUrlForDay } from "@/components/schedule/utils";
import { streamEmbedUrlForRoom } from "@/data/streams";
import { playingHandoff, registerYouTubePlayer } from "./youtubeHandoff";

/**
 * Recording / livestream for a session:
 * - recording available (YouTube, else StreamEth) -> embed it
 * - no recording, session on now (`onNow`: the caller's sticky reading of
 *   the ten minutes before the start to ten after the end,
 *   src/data/liveWindow.ts, the same as the transcript link's)
 *   -> embed the room's stream: the conference-day URL from the room data
 *   when there is one, else the event's per-stage stream (src/data/streams.ts)
 * - in that same span, a room with translationUrl -> render "Live translation
 *   available" link (with or without an embed)
 * - otherwise render nothing (no dead placeholder boxes when neither embed nor
 *   translation link is available); the details layout shows the session
 *   card instead
 *
 * `active` (desktop side panel only): false renders the slot without the
 * player, so a panel hidden behind the expanded page holds no second
 * stream. The YouTube players hand playback over to each other through
 * youtubeHandoff.ts, so Expand and Back keep the same video going.
 */

// Single source of truth for "will SessionMedia render anything?" — the
// details layout swaps in the track banner when this comes back empty, so
// the decision must live in one place or the two drift (empty top slot).
export function getSessionMediaSources(
  session: Session,
  onNow: boolean,
  eventStartDate?: string
) {
  const recordingSrc = session.sources_youtubeId
    ? `https://www.youtube.com/embed/${session.sources_youtubeId}`
    : session.sources_streamethId
      ? `https://streameth.org/embed/?session=${session.sources_streamethId}&vod=true`
      : null;

  const translationUrl = onNow ? (session.room?.translationUrl ?? null) : null;

  let streamSrc: string | null = null;
  if (!recordingSrc && session.room && onNow) {
    streamSrc =
      streamUrlForDay(session.room, session.start * 1000, eventStartDate) ??
      streamEmbedUrlForRoom(session.room.id);
  }

  return { src: recordingSrc ?? streamSrc, streamSrc, translationUrl };
}

export function sessionHasMedia(
  session: Session,
  onNow: boolean,
  eventStartDate?: string
) {
  const { src, translationUrl } = getSessionMediaSources(session, onNow, eventStartDate);
  return !!(src || translationUrl);
}

export function SessionMedia({
  session,
  onNow,
  active = true,
}: {
  session: Session;
  onNow: boolean;
  active?: boolean;
}) {
  const { event } = useEvent();
  const online = useOnline();

  const { src, streamSrc, translationUrl } = getSessionMediaSources(
    session,
    onNow,
    event?.startDate
  );
  if (!src && !translationUrl) return null;

  return (
    // No own margins — the details layout's gaps own the spacing around media.
    <div className="flex flex-col gap-2">
      {streamSrc && (
        <p className="mb-1 text-sm font-semibold text-dc-red">Livestream</p>
      )}
      {/* Embeds are live-only: offline, say so instead of a black box. */}
      {src &&
        (online ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            {active && (
              // Keyed by src: swapping `src` on a live iframe navigates it,
              // which adds a history entry, so closing a detail after
              // viewing several sessions needed one back() per video.
              // Remounting instead keeps history clean.
              <EmbedFrame key={src} src={src} live={!!streamSrc} title={session.title} />
            )}
          </div>
        ) : (
          <NeedsConnection
            what={streamSrc ? "The livestream" : "The recording"}
          />
        ))}
      {translationUrl && (
        // Centered under the thumbnail (Figma), as a bold purple text link.
        <a
          href={translationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-center text-center text-sm font-bold text-dc-purple hover:underline"
        >
          Live translation available
        </a>
      )}
    </div>
  );
}

const YOUTUBE_EMBED = "https://www.youtube.com/embed/";

/**
 * The embed iframe. A YouTube embed on desktop joins the hand-off
 * (youtubeHandoff.ts): its URL gains the IFrame API params, and when another
 * player of the same video is playing it starts with autoplay (and the
 * position, for a recording; a live stream rejoins at the edge). The URL is
 * fixed at mount: the hand-off is read once, and a later re-render must not
 * navigate the iframe. StreamEth embeds and phones mount the plain URL.
 */
function EmbedFrame({
  src,
  live,
  title,
}: {
  src: string;
  live: boolean;
  title: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  // Decided once, synchronously: the reactive desktop hook is false on a
  // component's first render, and this URL cannot change after it.
  const [{ embedSrc, handoff }] = useState(() => {
    const handoff =
      src.startsWith(YOUTUBE_EMBED) &&
      typeof window !== "undefined" &&
      window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
    if (!handoff) return { embedSrc: src, handoff };
    const url = new URL(src);
    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("origin", window.location.origin);
    const playing = playingHandoff(src);
    if (playing) {
      url.searchParams.set("autoplay", "1");
      if (!live) url.searchParams.set("start", String(Math.floor(playing.time)));
    }
    return { embedSrc: url.toString(), handoff };
  });

  useEffect(() => {
    if (!handoff || !ref.current) return;
    return registerYouTubePlayer(ref.current, src);
  }, [handoff, src]);

  return (
    <iframe
      ref={ref}
      src={embedSrc}
      title={title}
      className="h-full w-full border-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  );
}
