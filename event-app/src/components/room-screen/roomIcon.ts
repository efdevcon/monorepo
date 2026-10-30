/**
 * Place icon for a room, by room id: the same PNGs the JWCC venue map draws
 * over each stage (`map/venue-map/data/areas.ts`, icons under
 * public/maps/devcon-8/icons), so the room screens and the map agree. The
 * Main Stage is the Lotus hall, so it shares the lotus; the CLS Builders Room
 * borrows the Community Led Stage's icon until the map has one for it (Scott,
 * 2026-10-29). The "Stage N" rules cover the ids the test dataset still
 * carries. Pure, so the data tests can cover it.
 */
const ICON_RULES: [RegExp, string][] = [
  [/^main-stage|^lotus-stage|^stage-[123]\b/i, "lotus"],
  [/^jasmine-stage|^stage-4\b/i, "jasmine"],
  [/^lightning-stage|^stage-5\b/i, "lightning-stage"],
  [/^community-led-stage|^cls-builders-room|^stage-6\b/i, "community-led-stage"],
  [/^workshop-/i, "workshop"],
  [/^music-stage/i, "music-stage"],
];

export const ROOM_ICON_URLS = [...new Set(ICON_RULES.map(([, name]) => `/maps/devcon-8/icons/${name}.png`))];

/** URL of the room's place icon, or null when the room has none. */
export function roomIconUrl(roomId: string): string | null {
  const name = ICON_RULES.find(([re]) => re.test(roomId))?.[1];
  return name ? `/maps/devcon-8/icons/${name}.png` : null;
}
