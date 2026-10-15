/**
 * Theme icon for a room, by room id: the Devcon 8 stages carry a Thai-craft
 * theme (Main Stage "Masks", Stage 1 "Fans", ...) and the venue map draws
 * each with an icon from public/maps/devcon-8/icons. Same table and files as
 * the 3D map's icons.ts (PR 131); fold the two together once that lands.
 * Pure, so the data tests can cover it.
 */
const ICON_RULES: [RegExp, string][] = [
  // Devcon 8 ids since the 2026-10-14 Pretalx rename (Stage 1–3 became the
  // Lotus stages, 4 Jasmine, 5 the Lightning stage, 6 the community-led
  // stage), then the "Stage N" ids the test dataset still carries.
  [/^lotus-stage-1|^stage-1/i, "fan"],
  [/^lotus-stage-2|^stage-2/i, "lantern"],
  [/^lotus-stage-3|^st(a)?ge-3/i, "mats"],
  [/^jasmine-stage|^stage-4/i, "leaf"],
  [/^lightning-stage|^stage-5/i, "hat"],
  [/^community-led-stage|^stage-6/i, "kite"],
  [/^main-stage/i, "mask"],
];

export const ROOM_ICON_URLS = [...new Set(ICON_RULES.map(([, name]) => `/maps/devcon-8/icons/${name}.png`))];

/** URL of the room's theme icon, or null when the room has none. */
export function roomIconUrl(roomId: string): string | null {
  const name = ICON_RULES.find(([re]) => re.test(roomId))?.[1];
  return name ? `/maps/devcon-8/icons/${name}.png` : null;
}
