import type { FindEntry, FindGroup } from "./pois";
import type { LevelId } from "./types";

/**
 * Find categories (pois.ts ids, in display order) whose places the floor
 * legend explains while that floor is open. Only what the map does not make
 * obvious on its own goes here: the stages read as plain purple blocks with a
 * theme icon each, so they came first (Scott, 2026-09-21). Add a category id
 * to surface another group; the rewrite carries this as a `legend` flag on
 * its category catalogue.
 */
export const LEGEND_CATEGORIES: readonly string[] = ["stages"];

/**
 * Per floor, the places the legend lists: every entry of the legend categories
 * on that floor, categories in LEGEND_CATEGORIES order, entries in Find's
 * order (same-name places already collapsed into one entry). Floors with
 * nothing to explain are absent.
 */
export function buildFloorLegends(groups: FindGroup[]): Map<LevelId, FindEntry[]> {
  const legends = new Map<LevelId, FindEntry[]>();
  for (const id of LEGEND_CATEGORIES) {
    const group = groups.find((g) => g.category.id === id);
    if (!group) continue;
    for (const floor of group.floors) legends.set(floor.level, [...(legends.get(floor.level) ?? []), ...floor.entries]);
  }
  return legends;
}
