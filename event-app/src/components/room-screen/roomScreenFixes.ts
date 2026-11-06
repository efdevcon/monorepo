import APP_CONFIG from "@/CONFIG";
import type { Session } from "@/data/models";
import { sessionCardUrl } from "@/data/sessionCard";

/**
 * Room-screen-only corrections: what a room's TV shows, without touching the
 * schedule anywhere else in the app. Each entry folds a session listed twice
 * (once in the main programme, once in the Community Hubs' programme) into
 * the listing the screen keeps: the duplicate is hidden, its speakers replace
 * the kept session's, the kept session runs until the later of the two ends,
 * and it takes the duplicate's share card (the image its session page shows)
 * as `image`, which the screen shows in the empty Up next rail. With
 * `liveStream`, the rail plays the room's livestream (muted) while the kept
 * session is on, and the card is the fallback.
 */
const MERGES: { room: string; keep: string; drop: string; liveStream?: boolean }[] = [
  // Music Stage closing ceremony: the hubs' entry stays, with the main entry's speakers, end time and card.
  { room: "music-stage", keep: "music-stage-s45", drop: "closing-ceremony", liveStream: true },
];

/** Whether the screen plays the room's livestream in the empty rail while this session is on. */
export function liveStreamInRail(roomId: string, sessionId: string | undefined): boolean {
  return MERGES.some((m) => m.room === roomId && m.keep === sessionId && m.liveStream);
}

export function applyRoomScreenFixes(roomId: string, sessions: Session[]): Session[] {
  let out = sessions;
  for (const merge of MERGES) {
    // Without the kept listing (the hubs' programme not loaded yet) the duplicate stays, so the session never vanishes.
    if (merge.room !== roomId || !out.some((s) => s.id === merge.keep)) continue;
    const dropped = out.find((s) => s.id === merge.drop);
    out = out
      .filter((s) => s.id !== merge.drop)
      .map((s) =>
        s.id === merge.keep && dropped
          ? {
              ...s,
              speakers: dropped.speakers.length > 0 ? dropped.speakers : s.speakers,
              end: Math.max(s.end, dropped.end),
              image: sessionCardUrl(APP_CONFIG.SOCIAL_CARD_ORIGIN, dropped),
            }
          : s
      );
  }
  return out;
}
