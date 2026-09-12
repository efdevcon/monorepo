/** Theme icon (public/maps/devcon-8/icons/<name>.png) for an area id. Mirrors ICONS in scripts/plan-map-build.mjs. */
const ICON_RULES: [RegExp, string][] = [
  [/^stage-1/i, "fan"],
  [/^stage-2/i, "lantern"],
  [/^st(a)?ge-3/i, "mats"],
  [/^stage-4/i, "leaf"],
  [/^stage-5/i, "hat"],
  [/^stage-6/i, "kite"],
  [/^main-stage/i, "mask"],
  [/coffee-station/i, "coffee"],
  [/community-hub/i, "community-hub"],
  [/^cowork/i, "cowork"],
  [/discussion-corner/i, "discussion-corner"],
  [/^toilets/i, "toilets"],
  [/^press/i, "press"],
  [/impact/i, "impact"],
  [/snack/i, "snack"],
  [/^food-area/i, "food-area"],
  [/^decompression-zone/i, "decompression"],
  [/^hacker-cave/i, "hacker-cave"],
  [/^playground/i, "playground"],
  [/^registration/i, "registration-wristband"],
  [/^swag-station/i, "swag-station"],
  [/^frog-crypto/i, "frogcrypto"],
];

export function iconFor(id: string): string | null {
  return ICON_RULES.find(([re]) => re.test(id))?.[1] ?? null;
}

export const iconUrl = (name: string) => `/maps/devcon-8/icons/${name}.png`;
