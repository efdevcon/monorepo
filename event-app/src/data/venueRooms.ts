/**
 * Devcon 8 room presentation, keyed by the Pretalx room id (the slug the
 * bundle carries as `slot_roomId`): the name the app shows and the order
 * the timeline lists the lanes in. Pretalx keeps its own names — the
 * programme team's tooling reads them — so both are applied app-side, at
 * read time in `materialize.ts` and in the timeline's room sort. Rooms not
 * listed keep their Pretalx name and sort after these, alphabetically.
 *
 * The id IS the slug of the Pretalx name, so a rename in Pretalx changes it
 * and silently drops the room out of these tables (the 2026-10-14 stage
 * rename did exactly that). Check against `GET /events/devcon8/rooms` after
 * any rename; the `data:test` fixture carries the same ids.
 */

/**
 * App names where the Pretalx one reads badly on a card (Scott, 2026-10-13).
 * Since the 2026-10-14 rename the Pretalx names read well themselves
 * ("Main Stage (Lotus)", "Lotus Stage 1", "Jasmine Stage 4", "Lightning
 * Stage"); only the music stage's capitalisation is left to fix.
 */
const DISPLAY_NAMES: Record<string, string> = {
  "music-stage": "Music Stage",
};

/**
 * Timeline lane order: the Main Stage (the Lotus hall) always first, then its
 * three parts, Jasmine, the Lightning stage, the two CLS stages, the
 * workshops, then the music stage. Ids as served on 2026-10-15.
 */
export const TIMELINE_ROOM_ORDER: readonly string[] = [
  "main-stage-lotus",
  "lotus-stage-1",
  "lotus-stage-2",
  "lotus-stage-3",
  "jasmine-stage-4",
  "lightning-stage",
  "community-led-stage",
  "cls-builders-room",
  "workshop-1",
  "workshop-2",
  "music-stage",
];

export function roomDisplayName(id: string, name: string): string {
  return DISPLAY_NAMES[id] ?? name;
}

/** Position in the timeline order, or `Infinity` for a room not in it. */
export function timelineRoomRank(id: string | undefined): number {
  const i = id ? TIMELINE_ROOM_ORDER.indexOf(id) : -1;
  return i === -1 ? Infinity : i;
}
