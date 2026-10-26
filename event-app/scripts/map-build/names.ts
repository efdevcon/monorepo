/**
 * Layer-name grammar of the plan exports. Figma keeps layer names as ids and
 * suffixes duplicates with `_2`; names may carry `&` (exported as `&#38;`)
 * and capitals. Normalised id: lower-case, every run of non-alphanumerics
 * becomes one dash (`tea-&-coffee-7` → `tea-coffee-7`, `wall_3` → `wall-3`).
 * A trailing `-<n>` is the instance number; the rest is the area id.
 */
export type ParsedName = { id: string; areaId: string; instance: number | null };

/** Figma's default names: a layer nobody named. */
const DEFAULT_NAME = /^(Vector|Group|Rectangle|Ellipse|Line|Union|Subtract|Intersect|Exclude|Frame|Polygon|Star|Boolean)(_\d+)?$/i;

export const isDefaultName = (name: string | null): boolean => name === null || DEFAULT_NAME.test(name);

export function normaliseId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseName(name: string): ParsedName {
  const id = normaliseId(name);
  const m = /^(.*?)-(\d+)$/.exec(id);
  if (m && m[1] !== "") return { id, areaId: m[1], instance: Number(m[2]) };
  return { id, areaId: id, instance: null };
}

/** The top-level groups a floor export must have (Figma layer names; `Text & Icon` exports as `Text__x26__Icon`). */
export const LAYER_GROUPS = {
  background: "background",
  colourBox: "colour-box",
  outline: "outline",
  textIcon: "text-x26-icon",
} as const;

/** The exported form of "Text & Icon" normalises to `text-x26-icon`; accept the plain spelling too. */
export const isTextIconGroup = (id: string) => id === LAYER_GROUPS.textIcon || id === "text-icon";

/** The layer groups the build reads geometry from (plus `meta`); everything else under the root is skipped as text and icons. */
export const isGeometryGroup = (id: string) => id === LAYER_GROUPS.background || id === LAYER_GROUPS.colourBox || id === LAYER_GROUPS.outline || id === "meta";
