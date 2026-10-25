import { byName, sortByLevel, type FindEntry, type FindGroup } from "../find/catalogue";
import { LEVEL_ALIASES, type LevelId } from "../data/levels";

/**
 * Splits a floor off the query (someone may only know "it's on level 3"):
 * "level 3" → L3 and nothing else, "washroom l3" / "l3 washroom" → L3 +
 * "washroom". Bare digits are never a floor ("hub 1" stays a name search).
 */
export function parseFloorQuery(query: string): { level: LevelId | null; rest: string } {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  for (const [level, alias] of LEVEL_ALIASES) {
    if (q === alias) return { level, rest: "" };
    if (q.startsWith(`${alias} `)) return { level, rest: q.slice(alias.length + 1) };
    if (q.endsWith(` ${alias}`)) return { level, rest: q.slice(0, -alias.length - 1) };
  }
  return { level: null, rest: q };
}

export type SearchResult = {
  /** The floor the query named, with every place on it counted; shown as a row that opens the floor. */
  floor: { level: LevelId; name: string; count: number } | null;
  hits: FindEntry[];
};

/**
 * Case-insensitive substring match on the place name or its category label.
 * A floor in the query scopes the search to it, or lists the whole floor in
 * category order when it is the whole query; text searches sort by name.
 */
export function searchFind(groups: FindGroup[], query: string): SearchResult {
  const { level, rest } = parseFloorQuery(query);
  if (!level && !rest) return { floor: null, hits: [] };
  const hits: FindEntry[] = [];
  let floorName = level ?? "";
  let floorCount = 0;
  for (const group of groups) {
    const categoryHit = rest !== "" && group.category.label.toLowerCase().includes(rest);
    for (const floor of group.floors) {
      if (level && floor.level !== level) continue;
      if (level) {
        floorName = floor.name;
        floorCount += floor.entries.length;
      }
      for (const entry of floor.entries) if (rest === "" || categoryHit || entry.name.toLowerCase().includes(rest)) hits.push(entry);
    }
  }
  return { floor: level ? { level, name: floorName, count: floorCount } : null, hits: rest === "" ? hits : hits.sort((a, b) => byName(a, b) || sortByLevel(a, b)) };
}
