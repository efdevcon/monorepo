/**
 * One floor export → the bundle's MapLevel. Classifies every drawn element
 * by the layer group it sits in (Background / Colour_Box / Outline / Text &
 * Icon), joins the colour boxes to the area catalogue, expands the wall
 * strokes into geometry with the door openings cut out, and converts
 * everything to metres.
 */
import fs from "node:fs";
import path from "node:path";
import { AREAS, isAreaId, ROOMS, type AreaSpec } from "../../src/app/(page-layout)/map/venue-map/data/areas";
import { LEVELS } from "../../src/app/(page-layout)/map/venue-map/data/levels";
import { mapBundleSchema, type GroundBounds, type MapBundle, type MapLevel, type MapShape } from "../../src/app/(page-layout)/map/venue-map/data/planSchema";
import { DOOR_CUT_MARGIN_PX, FALLBACK_METRES_PER_PX, FLATNESS_PX, HEIGHTS, ICONS_DIR, ROOT, SIMPLIFY_PX } from "./config";
import { area, bbox, cutPolyline, polylabel, ringsToPolygons, simplify, strokeToPolygons, type Polygon, type Ring } from "./geometry";
import { isDefaultName, isTextIconGroup, LAYER_GROUPS, normaliseId, parseName } from "./names";
import type { Report } from "./report";
import { walkSvg, type Drawn } from "./svg";
import { parseXml } from "./xml";

export type LevelSpec = (typeof LEVELS)[number];

const hex = (c: string) => (c === "white" ? "#ffffff" : c === "black" ? "#000000" : c.toLowerCase());

/** Closed subpaths of a drawn element as polygons (even-odd nesting), simplified. */
function filledPolygons(d: Drawn): Polygon[] {
  const rings: Ring[] = d.subpaths.filter((s) => s.closed || s.points.length >= 3).map((s) => simplify(s.points, SIMPLIFY_PX));
  return ringsToPolygons(rings);
}

function strokedPolygons(d: Drawn, cuts: [number, number, number, number][]): Polygon[] {
  const out: Polygon[] = [];
  for (const s of d.subpaths) {
    const runs = cuts.length ? cutPolyline(s.points, s.closed, cuts, DOOR_CUT_MARGIN_PX) : [{ points: s.points, closed: s.closed }];
    for (const run of runs) out.push(...strokeToPolygons(simplify(run.points, SIMPLIFY_PX), run.closed, d.paint.strokeWidth));
  }
  return out;
}

function toShape(level: string, id: string, kind: MapShape["kind"], polygons: Polygon[], height: number, fill: string, outline: boolean, scale: number, extra: Partial<MapShape> = {}): MapShape | null {
  const scaled = polygons
    .map((p) => ({ outer: p.outer.map(([x, y]) => [round(x * scale), round(y * scale)] as [number, number]), holes: p.holes.map((h) => h.map(([x, y]) => [round(x * scale), round(y * scale)] as [number, number])) }))
    .filter((p) => p.outer.length >= 3);
  if (!scaled.length) return null;
  const largest = scaled.reduce((a, b) => (area(b.outer) > area(a.outer) ? b : a));
  const [minX, minZ, maxX, maxZ] = bbox(scaled.flatMap((p) => [p.outer, ...p.holes]));
  const anchor = polylabel(largest, 0.02);
  return { key: `${level}/${id}`, id, level, kind, polygons: scaled, anchor: [round(anchor[0]), round(anchor[1])], bbox: [round(minX), round(minZ), round(maxX), round(maxZ)], height, fill: hex(fill), outline, ...extra };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function buildLevel(spec: LevelSpec, report: Report): { level: MapLevel | null; metresPerPx: number; viewBox: [number, number, number, number]; textIconCount: number } {
  const file = spec.source;
  const source = fs.readFileSync(path.join(ROOT, file), "utf8");
  const { drawn, warnings, viewBox } = walkSvg(parseXml(source), FLATNESS_PX);
  for (const w of warnings) report.warn(file, w.id, w.message);
  const result = { level: null as MapLevel | null, metresPerPx: FALLBACK_METRES_PER_PX, viewBox, textIconCount: 0 };

  const rootGroup = drawn[0]?.groups[0];
  if (rootGroup === undefined) {
    report.error(file, null, "no drawable content");
    return result;
  }
  if (normaliseId(rootGroup) !== spec.id.toLowerCase()) report.warn(file, rootGroup, `root group is "${rootGroup}", expected "${spec.id}" (the floor id)`);

  // Scale line: meta/scale-<metres>, a straight line of known length.
  const meta = drawn.filter((d) => d.groups[1] !== undefined && normaliseId(d.groups[1]) === "meta");
  for (const m of meta) {
    const match = /^scale-(\d+(?:\.\d+)?)$/.exec(normaliseId(m.id ?? ""));
    const pts = m.subpaths[0]?.points;
    if (!match || !pts || pts.length < 2) {
      report.warn(file, m.id, "meta layer ignored (expected scale-<metres> on a straight line)");
      continue;
    }
    const len = Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]);
    result.metresPerPx = Number(match[1]) / len;
    report.info(file, m.id, `scale ${result.metresPerPx.toFixed(5)} m/px`);
  }
  const scale = result.metresPerPx;

  const byGroup = (name: string) => drawn.filter((d) => d.groups[1] !== undefined && normaliseId(d.groups[1]) === name);
  for (const d of drawn) {
    if (d.groups.length < 2) report.error(file, d.id, "drawn outside the layer groups (Background / Colour_Box / Outline / Text & Icon)");
    else {
      const g = normaliseId(d.groups[1]);
      if (!Object.values<string>(LAYER_GROUPS).includes(g) && !isTextIconGroup(g) && g !== "meta") report.error(file, d.groups[1], `unknown layer group "${d.groups[1]}"`);
    }
  }
  result.textIconCount = drawn.filter((d) => d.groups[1] !== undefined && isTextIconGroup(normaliseId(d.groups[1]))).length;

  const shapes: MapShape[] = [];
  const ids = new Set<string>();
  const addShape = (s: MapShape | null, id: string | null) => {
    if (!s) {
      report.warn(file, id, "no closed geometry, dropped");
      return;
    }
    if (ids.has(s.id)) {
      report.error(file, s.id, "duplicate layer id on this floor");
      return;
    }
    ids.add(s.id);
    shapes.push(s);
  };

  // Background → the slab.
  const background = byGroup(LAYER_GROUPS.background);
  if (background.length !== 1) report.error(file, null, `Background must hold exactly one shape (found ${background.length})`);
  const slabFill = background[0]?.paint.fill ?? "#e4e0f8";
  if (background[0]) addShape(toShape(spec.id, "slab", "slab", filledPolygons(background[0]), HEIGHTS.slab, slabFill, true, scale), "slab");

  // Outline: walls (named wall*, direct children) and flat decoration; slab-coloured patches are door openings.
  const outline = byGroup(LAYER_GROUPS.outline);
  const isWall = (d: Drawn) => d.groups.length === 2 && d.id !== null && /^wall(-\d+)?$/.test(normaliseId(d.id));
  const isDoorPatch = (d: Drawn) => !isWall(d) && d.paint.fill !== null && hex(d.paint.fill) === hex(slabFill);
  const doorCuts = outline.filter(isDoorPatch).map((d) => bbox(d.subpaths.map((s) => s.points)));
  let wallN = 0;
  let decoN = 0;
  for (const d of outline) {
    if (isWall(d)) {
      if (!d.paint.stroke) {
        report.error(file, d.id, "a wall must be a stroked line (no fill)");
        continue;
      }
      addShape(toShape(spec.id, `wall-${++wallN}`, "wall", strokedPolygons(d, doorCuts), HEIGHTS.wall, d.paint.stroke, true, scale), d.id);
      continue;
    }
    if (isDoorPatch(d)) continue;
    const groupName = d.groups[2] !== undefined && !isDefaultName(d.groups[2]) ? normaliseId(d.groups[2]) : "deco";
    if (d.paint.fill) addShape(toShape(spec.id, `${groupName}-${++decoN}`, "deco", filledPolygons(d), HEIGHTS.deco, d.paint.fill, false, scale), d.id);
    if (d.paint.stroke) addShape(toShape(spec.id, `${groupName}-${++decoN}`, "deco", strokedPolygons(d, []), HEIGHTS.deco, d.paint.stroke, false, scale), d.id);
  }
  report.info(file, null, `${doorCuts.length} door openings cut from ${wallN} walls`);

  // Colour boxes → areas, joined to the catalogue.
  const usedAreaIds = new Set<string>();
  for (const d of byGroup(LAYER_GROUPS.colourBox)) {
    if (isDefaultName(d.id)) {
      report.error(file, d.id, "unnamed colour box (give the layer its area id in Figma)");
      continue;
    }
    const { id, areaId, instance } = parseName(d.id!);
    if (!isAreaId(areaId)) {
      report.error(file, d.id, `no catalogue entry for "${areaId}" (data/areas.ts)`);
      continue;
    }
    const entry: AreaSpec = AREAS[areaId];
    if (entry.name.includes("#") && instance === null) report.error(file, d.id, `"${entry.name}" needs an instance number on the layer (${areaId}-<n>)`);
    if (!d.paint.fill) {
      report.error(file, d.id, "colour box without a fill");
      continue;
    }
    usedAreaIds.add(areaId);
    addShape(toShape(spec.id, id, "area", filledPolygons(d), HEIGHTS[entry.heightClass], d.paint.fill, true, scale, { areaId, ...(instance === null ? {} : { instance }) }), d.id);
  }
  for (const areaId of Object.keys(AREAS)) if (!usedAreaIds.has(areaId)) report.warn(file, areaId, "catalogue entry unused on this floor");

  const slab = shapes.find((s) => s.kind === "slab");
  const b = slab ? slab.bbox : bbox(shapes.flatMap((s) => s.polygons.flatMap((p) => [p.outer, ...p.holes])));
  result.level = { id: spec.id, label: spec.label, name: spec.name, bounds: { minX: b[0], minZ: b[1], maxX: b[2], maxZ: b[3] }, shapes };
  return result;
}

export function buildBundle(report: Report): MapBundle | null {
  const levels: MapLevel[] = [];
  let units: MapBundle["units"] | null = null;
  const used = new Set<string>();
  for (const spec of LEVELS) {
    const { level, metresPerPx, viewBox, textIconCount } = buildLevel(spec, report);
    if (!level) continue;
    report.info(spec.source, null, `${level.shapes.length} shapes (${level.shapes.filter((s) => s.kind === "area").length} areas, ${level.shapes.filter((s) => s.kind === "wall").length} walls, ${level.shapes.filter((s) => s.kind === "deco").length} deco); Text & Icon layer skipped (${textIconCount} paths)`);
    if (units && (units.viewBox.join() !== viewBox.join() || units.metresPerPlanPx !== metresPerPx)) report.error(spec.source, null, "viewBox / scale differs from the other floors");
    units ??= { metresPerPlanPx: metresPerPx, viewBox };
    levels.push(level);
    for (const s of level.shapes) if (s.areaId) used.add(s.areaId);
  }
  // Catalogue entries unused on every floor are an error (a stale entry, or a layer named wrong).
  for (const areaId of Object.keys(AREAS)) if (!used.has(areaId)) report.error("data/areas.ts", areaId, "catalogue entry matches no layer on any floor");
  // Icons must exist.
  for (const [areaId, entry] of Object.entries(AREAS) as [string, AreaSpec][]) {
    if (entry.icon && !fs.existsSync(path.join(ICONS_DIR, `${entry.icon}.png`))) report.error("data/areas.ts", areaId, `icon "${entry.icon}" has no PNG under public/maps/devcon-8/icons`);
  }
  if (!levels.length || !units) return null;
  const bounds: GroundBounds = levels.reduce(
    (acc, l) => ({ minX: Math.min(acc.minX, l.bounds.minX), minZ: Math.min(acc.minZ, l.bounds.minZ), maxX: Math.max(acc.maxX, l.bounds.maxX), maxZ: Math.max(acc.maxZ, l.bounds.maxZ) }),
    { minX: Infinity, minZ: Infinity, maxX: -Infinity, maxZ: -Infinity }
  );
  const bundle: MapBundle = { version: 2, units, bounds, levels };
  const parsed = mapBundleSchema.safeParse(bundle);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) report.error("bundle", null, `${issue.path.join(".")}: ${issue.message}`);
    return null;
  }
  return bundle;
}

/** `{ roomId: AreaKey[] }` for roomAreas.ts: every schedule room's footprints. */
export function buildRooms(bundle: MapBundle, report: Report): Record<string, string[]> {
  const keys = new Set(bundle.levels.flatMap((l) => l.shapes.filter((s) => s.kind === "area").map((s) => s.key)));
  const out: Record<string, string[]> = {};
  for (const [roomId, refs] of Object.entries(ROOMS)) {
    const resolved: string[] = [];
    for (const ref of refs) {
      const id = ref.instance === undefined ? ref.areaId : `${ref.areaId}-${ref.instance}`;
      const key = [...keys].find((k) => k.endsWith(`/${id}`));
      if (!key) report.error("data/areas.ts", roomId, `room maps to "${id}", which no floor draws`);
      else resolved.push(key);
    }
    if (resolved.length) out[roomId] = resolved;
  }
  return out;
}

export function iconNames(): string[] {
  return fs
    .readdirSync(ICONS_DIR)
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.replace(/\.png$/, ""))
    .sort();
}
