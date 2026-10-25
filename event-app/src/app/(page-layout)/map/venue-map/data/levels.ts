/**
 * The floors of the venue, bottom to top. One entry per plan SVG under
 * public/maps/jwcc/source/<id>.svg; the build (scripts/map-build) and the
 * runtime both read this list, so adding a floor is one line here plus the
 * export.
 */
export const LEVELS = [{ id: "L3", label: "L3", name: "Level 3", source: "public/maps/jwcc/source/L3.svg" }] as const;

export type LevelId = (typeof LEVELS)[number]["id"];
export const LEVEL_ORDER: readonly LevelId[] = LEVELS.map((l) => l.id);
export const levelIndex = (id: LevelId) => LEVEL_ORDER.indexOf(id);
export const isLevelId = (value: string): value is LevelId => (LEVEL_ORDER as readonly string[]).includes(value);

/** Single-key floor shortcuts, numbered from the lowest floor up; the controls legend advertises them. */
export const LEVEL_KEYS: Record<LevelId, string> = Object.fromEntries(LEVELS.map((l, i) => [l.id, String(i + 1)])) as Record<LevelId, string>;

/**
 * How people write a floor in Search ("level 3", "l3"), longest alias first so
 * "level 3" wins over an "l3"-style prefix. Bare digits are never a floor.
 */
export const LEVEL_ALIASES: readonly [LevelId, string][] = (
  [["L3", ["third floor", "3rd floor", "floor 3", "level 3", "level3", "l3"]]] as [LevelId, string[]][]
)
  .flatMap(([level, aliases]) => aliases.map((a) => [level, a] as [LevelId, string]))
  .sort((a, b) => b[1].length - a[1].length);
