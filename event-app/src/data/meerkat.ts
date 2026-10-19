import type { Session } from "@/data/models";

/**
 * The id Meerkat knows a session by: its Pretalx code (`sourceId`), the same
 * convention as Devcon 7 and what the Meerkat team syncs from Pretalx. Falls
 * back to our schedule slug for a bundle cached before the field shipped; that
 * only yields Meerkat's "no Q&A yet" state until the next schedule sync.
 */
export function meerkatEventId(session: Pick<Session, "id" | "sourceId">): string {
  const code = session.sourceId || session.id;
  return SHARED_QA[code] ?? code;
}

/**
 * Sessions that deliberately share another session's Q&A (feed and "Ask a
 * question"), keyed by Pretalx code. Requested by the speakers' team, 2026-10-16.
 */
const SHARED_QA: Record<string, string> = {
  // Devcon 8: the Audrey Tang + Vitalik fireside (YQMW7V) follows Audrey's keynote
  // (89KLNQ) on Lotus Stage 2 and picks up its unanswered questions.
  YQMW7V: "89KLNQ",
};

/**
 * Sessions whose Q&A is open before their day, keyed by Meerkat id (after
 * SHARED_QA, so a session sharing one of these opens early too). Every other
 * session's Q&A opens on its own day, event time (SessionQA).
 */
const QA_OPEN_EARLY = new Set<string>([
  // Devcon 8: Audrey Tang's keynote, collecting questions ahead of the day (speakers' team request).
  "89KLNQ",
]);

/** True when this Meerkat id takes questions before the session's day. */
export function qaOpensEarly(meerkatId: string): boolean {
  return QA_OPEN_EARLY.has(meerkatId);
}

/**
 * Rooms that never get a Q&A block (performances, not talks), by room id. Devcon 8: the Music
 * Stage. Other rooms (ceremonies, workshops, community-led) are still to be decided before the event.
 */
const NO_QA_ROOMS = new Set<string>(["music-stage"]);

/** True when sessions in this room have no Q&A at all. */
export function roomHasNoQa(roomId: string | undefined): boolean {
  return !!roomId && NO_QA_ROOMS.has(roomId);
}
