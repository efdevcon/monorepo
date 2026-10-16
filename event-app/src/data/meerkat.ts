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
