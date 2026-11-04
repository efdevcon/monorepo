import { byName, sortByLevel, type FindEntry, type FindGroup } from "../find/catalogue";
import { LEVEL_ALIASES, type LevelId } from "../data/levels";
import { SEARCH_TERMS, type SearchTerms } from "../data/searchTerms";

/** Shortest query that can match a term by its start ("lun" → lunch; "lu" would pull the food into every name search). */
const TERM_PREFIX_MIN = 3;

/** Every row a term appears in, longest terms first (see termTargets). */
const TERM_ROWS: ReadonlyArray<[term: string, rows: SearchTerms[]]> = (() => {
  const byTerm = new Map<string, SearchTerms[]>();
  for (const row of SEARCH_TERMS) for (const term of row.terms) byTerm.set(term, [...(byTerm.get(term) ?? []), row]);
  return [...byTerm].sort(([a], [b]) => b.length - a.length);
})();

/**
 * The categories and areas the query's custom terms (data/searchTerms.ts)
 * stand for. A phrase matched whole in the query consumes its words, longest
 * first, so "podcast room" brings up the Content Corner without "room"
 * pulling in every meeting room beside it (2026-11-04).
 */
export function termTargets(rest: string): { categories: Set<string>; areas: Set<string> } {
  const categories = new Set<string>();
  const areas = new Set<string>();
  if (rest === "") return { categories, areas };
  let words = ` ${rest} `;
  for (const [term, rows] of TERM_ROWS) {
    const spaced = ` ${term} `;
    const whole = words.includes(spaced);
    if (!whole && term !== rest && !(rest.length >= TERM_PREFIX_MIN && term.startsWith(rest))) continue;
    if (whole) words = words.replace(spaced, "  ");
    for (const { categories: c = [], areas: a = [] } of rows) {
      for (const id of c) categories.add(id);
      for (const id of a) areas.add(id);
    }
  }
  return { categories, areas };
}

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
 * Case-insensitive substring match on the place name or its category label,
 * plus the custom terms ("meeting" → the suites). A floor in the query
 * scopes the search to it, or lists the whole floor in category order when
 * it is the whole query; text searches sort by name.
 */
export function searchFind(groups: FindGroup[], query: string): SearchResult {
  const { level, rest } = parseFloorQuery(query);
  if (!level && !rest) return { floor: null, hits: [] };
  const hits: FindEntry[] = [];
  let floorName = level ?? "";
  let floorCount = 0;
  const targets = termTargets(rest);
  // A place listed under two categories (the CoW Swap stand: Food & drink and Supporters) is one hit: for a text query its own
  // category's row (its own icon), whichever group comes first; a bare floor query lists category by category, so the row stays
  // where it was found.
  const seen = new Map<string, number>();
  const counted = new Set<string>();
  for (const group of groups) {
    const categoryHit = rest !== "" && (group.category.label.toLowerCase().includes(rest) || targets.categories.has(group.category.id));
    for (const floor of group.floors) {
      if (level && floor.level !== level) continue;
      if (level) {
        floorName = floor.name;
        floorCount += floor.entries.filter((e) => !counted.has(e.key)).length;
        for (const e of floor.entries) counted.add(e.key);
      }
      for (const entry of floor.entries) {
        const at = seen.get(entry.key);
        if (at !== undefined) {
          if (!entry.secondary && rest !== "") hits[at] = entry;
          continue;
        }
        if (rest === "" || categoryHit || entry.name.toLowerCase().includes(rest) || entry.areas.some((a) => targets.areas.has(a.areaId))) {
          seen.set(entry.key, hits.length);
          hits.push(entry);
        }
      }
    }
  }
  return { floor: level ? { level, name: floorName, count: floorCount } : null, hits: rest === "" ? hits : hits.sort((a, b) => byName(a, b) || sortByLevel(a, b)) };
}
