/**
 * Devcon editions as the API names them. Up to Devcon 7 the event id is
 * "devcon-N"; Devcon 8 is "devcon8", the id the live event already uses in
 * devcon-api, devcon.org and the app (renaming it would touch every Devcon 8
 * session), so the archive maps editions to ids here instead of composing
 * "devcon-N" in place.
 */
export const LATEST_EDITION = 8;

/** API event id of a Devcon edition. */
export function editionEventId(edition: number): string {
  return edition >= 8 ? `devcon${edition}` : `devcon-${edition}`;
}

/** Newest first, the order the menus and filters show them. */
export const EDITION_EVENT_IDS = Array.from(
  { length: LATEST_EDITION + 1 },
  (_, i) => LATEST_EDITION - i
).map(editionEventId);

/** A numbered Devcon (Devconnect and the API's test events are not). */
export function isDevconEdition(event: { id: string }): boolean {
  return EDITION_EVENT_IDS.includes(event.id);
}

/** Edition number of a Devcon event id ("devcon-7" and "devcon8" alike); undefined for other events. */
export function editionOf(eventId: string | undefined): number | undefined {
  const match = eventId?.match(/^devcon-?(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

/**
 * URL segment to API event id: "8" and "devcon8" both mean Devcon 8, other
 * ids ("devconnect-arg") pass through.
 */
export function eventIdFromRoute(segment: string): string {
  return /^\d+$/.test(segment) ? editionEventId(Number(segment)) : segment;
}
