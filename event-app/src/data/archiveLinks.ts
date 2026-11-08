import { ARCHIVE_ORIGIN } from "./legacySessionLink";

/**
 * Links to the Devcon Archive (archive.devcon.org, the `archive/` package)
 * for an edition: every recording on its Watch page, or a list of sessions
 * on the archive's /my-interests page, which plays the first one with a
 * recording and lists the others beside the player, in schedule order. Sessions go by Pretalx code (six characters), so a long
 * list of stars still makes a short URL. Pure, checked in `pnpm data:test`.
 */

/** Every recording of the edition: the archive's Watch page on its edition filter. */
export function archiveWatchUrl(eventId: string): string {
  return `${ARCHIVE_ORIGIN}/watch/?event=${encodeURIComponent(eventId)}`;
}

/** The recordings of these sessions; the Watch page when there are none. */
export function archiveSessionsUrl(eventId: string, codes: readonly string[]): string {
  const unique = [...new Set(codes.map((code) => code.trim()).filter(Boolean))];
  if (unique.length === 0) return archiveWatchUrl(eventId);
  return `${ARCHIVE_ORIGIN}/my-interests/?event=${encodeURIComponent(eventId)}&sessions=${unique.map(encodeURIComponent).join(",")}`;
}
