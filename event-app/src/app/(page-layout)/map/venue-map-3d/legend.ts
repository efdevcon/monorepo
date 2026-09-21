import type { LevelId, PlanLevel, PlanScene, PlanShape } from "./types";

/**
 * What the floor legend explains on each floor: only what the map does not
 * make obvious on its own (Scott, 2026-09-21). Two chip kinds:
 *
 * - `places`: one chip per matching footprint (same-name copies collapse), its
 *   theme icon + short name. For the theme icons that don't read on their own
 *   (a fan for Stage 1, a crystal for the decompression zone…).
 * - `swatch`: ONE chip for every matching footprint, a rounded square in the
 *   footprints' fill colour + a label. For rooms that are colour-coded blocks
 *   without an icon (classrooms, breakout and meeting rooms, the speakers space).
 *
 * Layer ids are matched with the same regex style as pois.ts CATEGORIES. Add
 * a spec here to surface something else; the rewrite carries this on its area
 * catalogue (`legend` per category / area).
 */
export type LegendSpec = { kind: "places"; match: RegExp } | { kind: "swatch"; label: string; match: RegExp };

export const LEGEND: Record<LevelId, LegendSpec[]> = {
  G: [{ kind: "places", match: /^(decompression-zone|hacker-cave|playground|registration|swag-station)$/i }],
  L1: [
    { kind: "places", match: /^(stage-|stge-|main-stage)/i },
    { kind: "swatch", label: "Classrooms", match: /^classroom-/i },
  ],
  L2: [
    { kind: "places", match: /^blue-discussion-corner$/i },
    { kind: "swatch", label: "Breakout rooms", match: /^breakout-room-/i },
    { kind: "swatch", label: "Meeting rooms", match: /^meeting-room-/i },
    { kind: "swatch", label: "Speakers Space", match: /^speakers-space$/i },
  ],
};

/** One legend chip: a theme icon or a fill swatch, a label, and the footprints a tap shows. */
export type LegendEntry = { key: string; label: string; icon: string | null; swatch: string | null; shapes: PlanShape[] };

/** "Stage 1 - Fans" → "Stage 1": the theme suffix is the icon's job in the legend (Scott). */
const shortName = (name: string) => name.replace(/\s-\s.*$/, "");

/** "Meeting Room 2" before "Meeting Room 10". */
const byLabel = (a: LegendEntry, b: LegendEntry) => a.label.localeCompare(b.label, undefined, { numeric: true });

function buildFloorLegend(level: PlanLevel): LegendEntry[] {
  const entries: LegendEntry[] = [];
  for (const spec of LEGEND[level.id] ?? []) {
    const shapes = level.shapes.filter((s) => s.tappable && spec.match.test(s.id));
    if (shapes.length === 0) continue;
    if (spec.kind === "swatch") {
      entries.push({ key: `${level.id}/swatch:${spec.label}`, label: spec.label, icon: null, swatch: shapes[0].fill, shapes });
      continue;
    }
    // Same-name footprints collapse into one chip, like Find's entries.
    const byName = new Map<string, PlanShape[]>();
    for (const s of shapes) byName.set(s.name, [...(byName.get(s.name) ?? []), s]);
    entries.push(
      ...[...byName.entries()]
        .map(([name, group]) => ({ key: `${level.id}/${name}`, label: shortName(name), icon: group[0].icon, swatch: null, shapes: group }))
        .sort(byLabel)
    );
  }
  return entries;
}

/** Per floor, the legend chips in spec order; floors with nothing to explain are absent. */
export function buildFloorLegends(plan: PlanScene): Map<LevelId, LegendEntry[]> {
  const legends = new Map<LevelId, LegendEntry[]>();
  for (const level of plan.levels) {
    const entries = buildFloorLegend(level);
    if (entries.length) legends.set(level.id, entries);
  }
  return legends;
}
