import type { Session } from "@/data/models";

/**
 * The id Meerkat knows a session by: its Pretalx code (`sourceId`), the same
 * convention as Devcon 7 and what the Meerkat team syncs from Pretalx. Falls
 * back to our schedule slug for a bundle cached before the field shipped; that
 * only yields Meerkat's "no Q&A yet" state until the next schedule sync.
 */
export function meerkatEventId(session: Pick<Session, "id" | "sourceId">): string {
  return session.sourceId || session.id;
}
