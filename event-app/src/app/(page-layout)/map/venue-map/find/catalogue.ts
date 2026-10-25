import { CATEGORIES, type Category } from "../data/categories";
import { LEVEL_ORDER, LEVELS, levelIndex, type LevelId } from "../data/levels";
import { AREA_LIST, type Area, type AreaKey } from "../data/resolve";

/**
 * One row in Find or Search. Footprints sharing a name on the same floor
 * ("Washroom" ×2) collapse into one entry, so `areas` can hold several;
 * picking it highlights them all.
 */
export type FindEntry = { key: string; name: string; level: LevelId; iconUrl: string | null; iconBackdrop: string | null; areas: Area[]; category: Category };
export type FindFloor = { level: LevelId; name: string; entries: FindEntry[] };
export type FindGroup = { category: Category; count: number; floors: FindFloor[] };

/** "Hub 2" before "Hub 10". */
export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { numeric: true });

const levelName = new Map<LevelId, string>(LEVELS.map((l) => [l.id, l.name]));

/** Every tappable footprint grouped by category then floor, same-name copies per floor collapsed. Built once; the plan is static. */
export function buildFindGroups(areas: readonly Area[] = AREA_LIST): FindGroup[] {
  const buckets = new Map<string, Map<LevelId, Map<string, Area[]>>>();
  for (const area of areas) {
    const perLevel = buckets.get(area.category.id) ?? new Map<LevelId, Map<string, Area[]>>();
    buckets.set(area.category.id, perLevel);
    const perName = perLevel.get(area.level) ?? new Map<string, Area[]>();
    perLevel.set(area.level, perName);
    perName.set(area.name, [...(perName.get(area.name) ?? []), area]);
  }
  return CATEGORIES.flatMap((category) => {
    const perLevel = buckets.get(category.id);
    if (!perLevel) return [];
    const floors: FindFloor[] = LEVEL_ORDER.filter((id) => perLevel.has(id)).map((id) => ({
      level: id,
      name: levelName.get(id) ?? id,
      entries: [...perLevel.get(id)!.entries()]
        .map(([name, group]) => ({ key: group.length === 1 ? group[0].key : `${id}/${name}`, name, level: id, iconUrl: group[0].iconUrl, iconBackdrop: group[0].iconBackdrop, areas: group, category }))
        .sort(byName),
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
 * The open floor's legend: one swatch chip per category that asks for one
 * (categories.ts), in the fill most of its footprints use, listing every
 * footprint of that category on the floor. Floors with nothing to explain
 * get an empty list.
 */
export function buildFloorLegend(level: LevelId, areas: readonly Area[] = AREA_LIST): LegendEntry[] {
  const onFloor = areas.filter((a) => a.level === level);
  const entries: LegendEntry[] = [];
  for (const category of CATEGORIES) {
    if (!category.legend) continue;
    const members = onFloor.filter((a) => a.category.id === category.id);
    if (!members.length) continue;
    const fills = new Map<string, number>();
    for (const a of members) fills.set(a.shape.fill, (fills.get(a.shape.fill) ?? 0) + 1);
    const swatch = [...fills.entries()].sort((a, b) => b[1] - a[1])[0][0];
    entries.push({ key: `${level}/legend:${category.id}`, label: category.legend, iconUrl: null, swatch, areas: members });
  }
  return entries;
}

export const sortByLevel = (a: { level: LevelId }, b: { level: LevelId }) => levelIndex(a.level) - levelIndex(b.level);
