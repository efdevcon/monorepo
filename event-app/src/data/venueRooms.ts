/**
 * Devcon 8 room presentation, keyed by the Pretalx room id (the slug the
 * bundle carries as `slot_roomId`): the name the app shows and the order
 * the timeline lists the lanes in. Pretalx keeps its own names — the
 * programme team's tooling reads them — so both are applied app-side, at
 * read time in `materialize.ts` and in the timeline's room sort. Rooms not
 * listed keep their Pretalx name and sort after these, alphabetically.
 */

/** App names where the Pretalx one reads badly on a card (Scott, 2026-10-13). */
const DISPLAY_NAMES: Record<string, string> = {
  "lightning-stage-1": "Lightning Stage",
  "stage-4-jasmine": "Jasmine 4",
  "music-stage": "Music Stage",
};

/**
 * Timeline lane order: the Lotus hall and its three parts, Jasmine, the
 * Lightning stage, the two CLS stages, the workshops, then the music stage.
 */
export const TIMELINE_ROOM_ORDER: readonly string[] = [
  "lotus-stage",
  "lotus-1",
  "lotus-2",
  "lotus-3",
  "stage-4-jasmine",
  "lightning-stage-1",
  "cls-stage",
  "cls-stage-builders-room",
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
