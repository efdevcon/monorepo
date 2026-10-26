/**
 * The floors of the venue, bottom to top. One entry per plan SVG under
 * public/maps/jwcc/source/<id>.svg; the build (scripts/map-build) and the
 * runtime both read this list, so adding a floor is one line here plus the
 * export.
 */
export const LEVELS = [
  { id: "L0", label: "L0", name: "Level 0", source: "public/maps/jwcc/source/L0.svg" },
  { id: "L1", label: "L1", name: "Level 1", source: "public/maps/jwcc/source/L1.svg" },
  { id: "L2", label: "L2", name: "Level 2", source: "public/maps/jwcc/source/L2.svg" },
  { id: "L3", label: "L3", name: "Level 3", source: "public/maps/jwcc/source/L3.svg" },
] as const;

export type LevelId = (typeof LEVELS)[number]["id"];
export const LEVEL_ORDER: readonly LevelId[] = LEVELS.map((l) => l.id);
export const levelIndex = (id: LevelId) => LEVEL_ORDER.indexOf(id);
export const isLevelId = (value: string): value is LevelId => (LEVEL_ORDER as readonly string[]).includes(value);

/** Single-key floor shortcuts: the floor's own number (L0 → 0), so the key reads like the label; the controls legend advertises them. */
export const LEVEL_KEYS: Record<LevelId, string> = Object.fromEntries(LEVELS.map((l) => [l.id, l.id.replace(/\D/g, "")])) as Record<LevelId, string>;

/**
 * How people write a floor in Search ("level 3", "l3"), longest alias first so
 * "level 3" wins over an "l3"-style prefix. Bare digits are never a floor.
 */
export const LEVEL_ALIASES: readonly [LevelId, string][] = (
  [
    ["L0", ["ground floor", "floor 0", "level 0", "level0", "l0"]],
    ["L1", ["first floor", "1st floor", "floor 1", "level 1", "level1", "l1"]],
    ["L2", ["second floor", "2nd floor", "floor 2", "level 2", "level2", "l2"]],
    ["L3", ["third floor", "3rd floor", "floor 3", "level 3", "level3", "l3"]],
  ] as [LevelId, string[]][]
)
  .flatMap(([level, aliases]) => aliases.map((a) => [level, a] as [LevelId, string]))
  .sort((a, b) => b[1].length - a[1].length);
