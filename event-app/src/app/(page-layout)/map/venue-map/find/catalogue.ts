import { AREAS } from "../data/areas";
import { CATEGORIES, type Category } from "../data/categories";
import { FLOOR_LEGENDS } from "../data/legend";
import { LEVEL_ORDER, LEVELS, levelIndex, type LevelId } from "../data/levels";
import { AREA_LIST, COMPOSITE_LIST, type Area, type AreaKey } from "../data/resolve";

/**
 * One row in Find or Search. Footprints sharing a name on the same floor
 * ("Washroom" ×2) collapse into one entry, so `areas` can hold several;
 * picking it highlights them all.
 */
export type FindEntry = { key: string; name: string; level: LevelId; iconUrl: string | null; iconBackdrop: string | null; areas: Area[]; category: Category; rank: number };
export type FindFloor = { level: LevelId; name: string; entries: FindEntry[] };
export type FindGroup = { category: Category; count: number; floors: FindFloor[] };

/** "Hub 2" before "Hub 10". */
export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { numeric: true });
/** Catalogue rank first (Main Stage, then the Lotus halls, then the rest), then by name. */
export const byRank = (a: { name: string; rank: number }, b: { name: string; rank: number }) => a.rank - b.rank || byName(a, b);

const levelName = new Map<LevelId, string>(LEVELS.map((l) => [l.id, l.name]));

/** Every tappable footprint grouped by category then floor, same-name copies per floor collapsed; a place with `alsoCategories` (the CoW Swap stand, under Supporters too) is a row in each. Built once; the plan is static. */
export function buildFindGroups(areas: readonly Area[] = AREA_LIST): FindGroup[] {
  const buckets = new Map<string, Map<LevelId, Map<string, Area[]>>>();
  for (const area of areas) {
    for (const category of [area.category, ...area.alsoCategories]) {
      const perLevel = buckets.get(category.id) ?? new Map<LevelId, Map<string, Area[]>>();
      buckets.set(category.id, perLevel);
      const perName = perLevel.get(area.level) ?? new Map<string, Area[]>();
      perLevel.set(area.level, perName);
      perName.set(area.name, [...(perName.get(area.name) ?? []), area]);
    }
  }
  return CATEGORIES.flatMap((category) => {
    const perLevel = buckets.get(category.id);
    if (!perLevel) return [];
    const floors: FindFloor[] = LEVEL_ORDER.filter((id) => perLevel.has(id)).map((id) => ({
      level: id,
      name: levelName.get(id) ?? id,
      entries: [
        ...[...perLevel.get(id)!.entries()].map(([name, group]) => ({ key: group.length === 1 ? group[0].key : `${id}/${name}`, name, level: id, iconUrl: group[0].cardIconUrl, iconBackdrop: group[0].iconBackdrop, areas: group, category, rank: group[0].rank })),
        // Composite rows (the Main Stage): one row standing for several footprints.
        // A composite row carries its members' icon (the Main Stage shows the lotus; Scott, 2026-10-26).
        ...COMPOSITE_LIST.filter((c) => c.category === category.id && c.level === id && c.areas.every((a) => areas.includes(a))).map((c) => ({ key: `${id}/composite:${c.id}`, name: c.name, level: id, iconUrl: c.areas[0].cardIconUrl, iconBackdrop: c.areas[0].iconBackdrop, areas: c.areas, category, rank: c.rank ?? 100 })),
      ].sort(byRank),
    }));
    return [{ category, count: floors.reduce((n, f) => n + f.entries.length, 0), floors }];
  });
}

export const FIND_GROUPS: FindGroup[] = buildFindGroups();

/** The primary of a group pick: the member nearest the group's centre. */
export function primaryOf(areas: readonly Area[]): AreaKey {
  if (areas.length === 1) return areas[0].key;
  const cx = areas.reduce((s, a) => s + a.shape.anchor[0], 0) / areas.length;
  const cz = areas.reduce((s, a) => s + a.shape.anchor[1], 0) / areas.length;
  return areas.reduce((best, a) => (Math.hypot(a.shape.anchor[0] - cx, a.shape.anchor[1] - cz) < Math.hypot(best.shape.anchor[0] - cx, best.shape.anchor[1] - cz) ? a : best)).key;
}

/** One legend chip: a swatch (per category) or a theme icon (per place), a label, and the footprints a tap shows. */
export type LegendEntry = { key: string; label: string; iconUrl: string | null; swatch: string | null; areas: Area[] };

/**
 * The open floor's legend. A floor listed in legend.ts gets one chip per
 * spec, in spec order: the type's theme icon (a swatch in its fill while it
 * has none) and label, tapping it shows every footprint of the type on the
 * floor (Levels 0–2 since 2026-10-26). Any other floor gets one swatch chip
 * per category that asks for one (categories.ts), in the fill most of its
 * footprints use, listing every footprint whose legend category it is
 * (areas.ts `legend` moves a footprint to the chip of its colour: the yellow
 * discussion corners sit with the hubs). Floors with nothing to explain get
 * an empty list.
 */
/** The fill most of the footprints use. */
function commonFill(members: readonly Area[]): string {
  const fills = new Map<string, number>();
  for (const a of members) fills.set(a.shape.fill, (fills.get(a.shape.fill) ?? 0) + 1);
  return [...fills.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function buildFloorLegend(level: LevelId, areas: readonly Area[] = AREA_LIST): LegendEntry[] {
  const onFloor = areas.filter((a) => a.level === level);
  const entries: LegendEntry[] = [];
  const specs = FLOOR_LEGENDS[level];
  if (specs) {
    for (const spec of specs) {
      const members = "areaId" in spec ? onFloor.filter((a) => a.areaId === spec.areaId) : onFloor.filter((a) => a.legendCategory.id === spec.category);
      if (!members.length) continue;
      const label = "label" in spec && spec.label ? spec.label : AREAS[members[0].areaId].name.replace(/\s*#$/, "");
      const key = "areaId" in spec ? `${level}/legend:${spec.areaId}` : `${level}/legend:${spec.category}`;
      const asSwatch = ("swatch" in spec && spec.swatch) || !members[0].cardIconUrl;
      entries.push({ key, label, iconUrl: asSwatch ? null : members[0].cardIconUrl, swatch: asSwatch ? commonFill(members) : null, areas: members });
    }
    return entries;
  }
  for (const category of CATEGORIES) {
    if (!category.legend) continue;
    const members = onFloor.filter((a) => a.legendCategory.id === category.id);
    if (!members.length) continue;
    entries.push({ key: `${level}/legend:${category.id}`, label: category.legend, iconUrl: null, swatch: commonFill(members), areas: members });
  }
  return entries;
}

export const sortByLevel = (a: { level: LevelId }, b: { level: LevelId }) => levelIndex(a.level) - levelIndex(b.level);
