import { Gamepad2, Handshake, Laptop, MapPin, Mic, Presentation, Ticket, Toilet, Users, Utensils, type LucideIcon } from "lucide-react";
import { shapeKey } from "./planArea";
import { LEVEL_ORDER, levelIndex, type LevelId, type PlanLevel, type PlanScene, type PlanShape } from "./types";

/** A Find category: a lucide icon for the list row and a rule on the plan layer id. */
export type FindCategory = { id: string; label: string; Icon: LucideIcon };

/**
 * One row in Find. Footprints sharing a name on the same floor ("Toilets" ×4)
 * collapse into one entry, so `shapes` can hold several; picking it highlights
 * them all.
 */
export type FindEntry = { key: string; name: string; level: LevelId; icon: string | null; shapes: PlanShape[] };
export type FindFloor = { level: LevelId; name: string; entries: FindEntry[] };
export type FindGroup = { category: FindCategory; count: number; floors: FindFloor[] };

/** Ordered as they appear in the Find list. Rules run in order; the last one catches everything else. */
const CATEGORIES: (FindCategory & { match: RegExp })[] = [
  { id: "stages", label: "Stages", Icon: Mic, match: /^(stage-|stge-|main-stage|music-stage)/i },
  { id: "classrooms", label: "Classrooms & breakout", Icon: Presentation, match: /^(classroom|breakout-room)/i },
  { id: "meeting", label: "Meeting rooms", Icon: Handshake, match: /^meeting-room/i },
  { id: "food", label: "Food & drink", Icon: Utensils, match: /^(food-area|food-garden|coffee-station|snack)/i },
  { id: "toilets", label: "Toilets", Icon: Toilet, match: /^toilets/i },
  { id: "cowork", label: "Cowork & discussion", Icon: Laptop, match: /^cowork|discussion-corner/i },
  { id: "hubs", label: "Community hubs", Icon: Users, match: /^community-hub/i },
  { id: "checkin", label: "Check-in & swag", Icon: Ticket, match: /^(registration|badge-station|swag-station)/i },
  { id: "fun", label: "Fun & rest", Icon: Gamepad2, match: /^(playground|frog-crypto|hacker-cave|decompression-zone|cursive)/i },
  { id: "other", label: "Other", Icon: MapPin, match: /./ },
];

export const FIND_CATEGORIES: FindCategory[] = CATEGORIES.map(({ id, label, Icon }) => ({ id, label, Icon }));

const categoryFor = (shape: PlanShape): FindCategory => CATEGORIES.find((c) => c.match.test(shape.id)) ?? CATEGORIES[CATEGORIES.length - 1];

/** "Meeting Room 2" before "Meeting Room 10". */
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { numeric: true });

/** Every tappable footprint of the plan, grouped by category then floor, duplicates per floor collapsed. */
export function buildFindGroups(plan: PlanScene): FindGroup[] {
  const levelName = new Map<LevelId, string>(plan.levels.map((l: PlanLevel) => [l.id, l.name]));
  // category id → level → name → shapes
  const buckets = new Map<string, Map<LevelId, Map<string, PlanShape[]>>>();
  for (const level of plan.levels) {
    for (const shape of level.shapes) {
      if (!shape.tappable) continue;
      const category = categoryFor(shape);
      const perLevel = buckets.get(category.id) ?? new Map<LevelId, Map<string, PlanShape[]>>();
      buckets.set(category.id, perLevel);
      const perName = perLevel.get(shape.level) ?? new Map<string, PlanShape[]>();
      perLevel.set(shape.level, perName);
      perName.set(shape.name, [...(perName.get(shape.name) ?? []), shape]);
    }
  }
  return CATEGORIES.flatMap((category) => {
    const perLevel = buckets.get(category.id);
    if (!perLevel) return [];
    const floors: FindFloor[] = LEVEL_ORDER.filter((id) => perLevel.has(id)).map((id) => ({
      level: id,
      name: levelName.get(id) ?? id,
      entries: [...perLevel.get(id)!.entries()]
        .map(([name, shapes]) => ({
          key: shapes.length === 1 ? shapeKey(shapes[0]) : `${id}/${name}`,
          name,
          level: id,
          icon: shapes[0].icon,
          shapes,
        }))
        .sort(byName),
    }));
    const count = floors.reduce((n, f) => n + f.entries.length, 0);
    return [{ category: { id: category.id, label: category.label, Icon: category.Icon }, count, floors }];
  });
}

export type FindHit = FindEntry & { category: FindCategory };

/** How people write a floor; longest alias first so "level 1" wins over "l1"-style prefixes. */
const FLOOR_ALIASES: [LevelId, string][] = (
  [
    ["G", ["ground floor", "groundfloor", "ground", "gf", "g"]],
    ["L1", ["first floor", "1st floor", "floor 1", "level 1", "level1", "l1"]],
    ["L2", ["second floor", "2nd floor", "floor 2", "level 2", "level2", "l2"]],
  ] as [LevelId, string[]][]
)
  .flatMap(([level, aliases]) => aliases.map((a) => [level, a] as [LevelId, string]))
  .sort((a, b) => b[1].length - a[1].length);

/**
 * Splits a floor off the query (someone may only know "it's on level 1"):
 * "level 2" → L2 and nothing else, "toilets l1" / "l1 toilets" → L1 + "toilets".
 * Bare digits are never a floor ("meeting room 1" stays a name search).
 */
export function parseFloorQuery(query: string): { level: LevelId | null; rest: string } {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  for (const [level, alias] of FLOOR_ALIASES) {
    if (q === alias) return { level, rest: "" };
    if (q.startsWith(`${alias} `)) return { level, rest: q.slice(alias.length + 1) };
    if (q.endsWith(` ${alias}`)) return { level, rest: q.slice(0, -alias.length - 1) };
  }
  return { level: null, rest: q };
}

export type FindSearch = {
  /** The floor the query named, with every place on it counted; shown as a row that opens the floor. */
  floor: { level: LevelId; name: string; count: number } | null;
  hits: FindHit[];
};

/**
 * Case-insensitive substring match on the place name or its category. A floor
 * in the query scopes the search to it, or lists the whole floor in category
 * order when it is the whole query; text searches sort by name, floors in
 * building order.
 */
export function searchFind(groups: FindGroup[], query: string): FindSearch {
  const { level, rest } = parseFloorQuery(query);
  if (!level && !rest) return { floor: null, hits: [] };
  const hits: FindHit[] = [];
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
      for (const entry of floor.entries) {
        if (rest === "" || categoryHit || entry.name.toLowerCase().includes(rest)) hits.push({ ...entry, category: group.category });
      }
    }
  }
  return {
    floor: level ? { level, name: floorName, count: floorCount } : null,
    hits: rest === "" ? hits : hits.sort((a, b) => byName(a, b) || levelIndex(a.level) - levelIndex(b.level)),
  };
}
