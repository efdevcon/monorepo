/**
 * One floor export → the bundle's MapLevel. Classifies every drawn element
 * by the layer group it sits in (Background / Colour_Box / Outline; the rest
 * is text and icons), joins the colour boxes to the area catalogue, expands
 * the wall strokes into geometry with the door openings cut out, registers
 * the floor on the reference floor (register.ts) and converts everything to
 * metres.
 */
import fs from "node:fs";
import path from "node:path";
import { AREAS, isAreaId, ROOMS, type AreaSpec } from "../../src/app/(page-layout)/map/venue-map/data/areas";
import { COMMUNITY_HUB_ROOM_PREFIX } from "../../src/data/communityHubs";
import { LEVELS } from "../../src/app/(page-layout)/map/venue-map/data/levels";
import { mapBundleSchema, type GroundBounds, type MapBundle, type MapLevel, type MapShape } from "../../src/app/(page-layout)/map/venue-map/data/planSchema";
import { COLUMN_MARKER_MAX_M, DOOR_CUT_MARGIN_PX, EXTERIOR_WALL_TOL_PX, FALLBACK_METRES_PER_PX, FLATNESS_PX, HATCH_MIN_STROKES, HEIGHTS, ICONS_DIR, LABEL_TAB_TOL_PX, NESTED_LIFT, OUTLINE_RING_MIN_PX, REFERENCE_LEVEL, REGISTRATION_AREA, ROOT, SIMPLIFY_PX, STAIRS_SYMBOL_M, VOID_EDGE_EPS_PX, WALL_MIN_STROKE_PX } from "./config";
import { area, bbox, cutPolyline, notchHoles, pointInRing, polylabel, ringsToPolygons, simplify, strokeToPolygons, widen, type Polygon, type Ring } from "./geometry";
import { isDefaultName, isGeometryGroup, isTextIconGroup, LAYER_GROUPS, normaliseId, parseName } from "./names";
import type { Point } from "./path";
import { registerFrames, type Frame, type RegistrationInput } from "./register";
import type { Report } from "./report";
import { walkSvg, type Drawn } from "./svg";
import { parseXml } from "./xml";

export type LevelSpec = (typeof LEVELS)[number];

/** A parsed export, before any classification. */
export type LoadedLevel = { spec: LevelSpec; file: string; drawn: Drawn[]; viewBox: [number, number, number, number] };

const hex = (c: string) => (c === "white" ? "#ffffff" : c === "black" ? "#000000" : c.toLowerCase());
const round = (n: number) => Math.round(n * 1000) / 1000;

/** Closed subpaths of a drawn element as polygons (even-odd nesting), simplified; `minWidthPx` widens thin strips. */
function filledPolygons(d: Drawn, minWidthPx = 0): Polygon[] {
  let rings: Ring[] = d.subpaths.filter((s) => s.closed || s.points.length >= 3).map((s) => simplify(s.points, SIMPLIFY_PX));
  if (minWidthPx > 0) rings = widen(rings, minWidthPx);
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

function toShape(level: string, id: string, kind: MapShape["kind"], polygons: Polygon[], height: number, fill: string, outline: boolean, frame: Frame, extra: Partial<MapShape> = {}): MapShape | null {
  const world = ([x, y]: Point): [number, number] => [round(x * frame.metresPerPx + frame.offset[0]), round(y * frame.metresPerPx + frame.offset[1])];
  const scaled = polygons.map((p) => ({ outer: p.outer.map(world), holes: p.holes.map((h) => h.map(world)) })).filter((p) => p.outer.length >= 3);
  if (!scaled.length) return null;
  const largest = scaled.reduce((a, b) => (area(b.outer) > area(a.outer) ? b : a));
  const [minX, minZ, maxX, maxZ] = bbox(scaled.flatMap((p) => [p.outer, ...p.holes]));
  const anchor = polylabel(largest, 0.02);
  return { key: `${level}/${id}`, id, level, kind, polygons: scaled, anchor: [round(anchor[0]), round(anchor[1])], bbox: [round(minX), round(minZ), round(maxX), round(maxZ)], height, fill: hex(fill), outline, ...extra };
}

export function loadLevel(spec: LevelSpec, report: Report): LoadedLevel {
  const file = spec.source;
  const source = fs.readFileSync(path.join(ROOT, file), "utf8");
  const { drawn, warnings, viewBox } = walkSvg(parseXml(source), FLATNESS_PX);
  for (const w of warnings) report.warn(file, w.id, w.message);
  return { spec, file, drawn, viewBox };
}

const layerOf = (d: Drawn) => (d.groups[1] === undefined ? "" : normaliseId(d.groups[1]));
const inLayer = (loaded: LoadedLevel, name: string) => loaded.drawn.filter((d) => layerOf(d) === name);

/** The `meta/scale-<metres>` line, as metres per px, or null without one. */
function metaScale(loaded: LoadedLevel, report: Report): number | null {
  let scale: number | null = null;
  for (const m of inLayer(loaded, "meta")) {
    const match = /^scale-(\d+(?:\.\d+)?)$/.exec(normaliseId(m.id ?? ""));
    const pts = m.subpaths[0]?.points;
    if (!match || !pts || pts.length < 2) {
      report.warn(loaded.file, m.id, "meta layer ignored (expected scale-<metres> on a straight line)");
      continue;
    }
    const len = Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]);
    scale = Number(match[1]) / len;
  }
  return scale;
}

/** Centres (plan px) of the registration footprints: the colour boxes of REGISTRATION_AREA. */
function registrationMarks(loaded: LoadedLevel): Point[] {
  return inLayer(loaded, LAYER_GROUPS.colourBox)
    .filter((d) => d.id !== null && parseName(d.id).areaId === REGISTRATION_AREA)
    .map((d) => {
      const [x0, y0, x1, y1] = bbox(d.subpaths.map((s) => s.points));
      return [(x0 + x1) / 2, (y0 + y1) / 2] as Point;
    });
}

/** The subgroup path of an Outline element below the layer (`Group_3/Group_4`), "" for a direct child. */
const subgroupOf = (d: Drawn) => d.groups.slice(2).join("/");
const isStrokeOnly = (d: Drawn) => !d.paint.fill && d.paint.stroke !== null;

/**
 * Outline subgroups the plan draws as symbols, found by their structure when
 * nobody named them: hatches (stair treads, operable-wall ticks: three or
 * more stroke-only lines and nothing else) stay flat, while escalators (the
 * plan's symbol: one closed and two open stroke-only lines with two filled
 * arrows in a child group) and stairs (two filled shapes in the plan's line
 * colour, the steps and the arrow, about 2 m across) become sprite-only areas
 * like the named ones. Only unnamed groups count; a named group is itself.
 */
function classifySubgroups(outline: Drawn[], metresPerPx: number, lineColour: string | null): { hatches: Set<string>; escalators: string[]; stairs: string[] } {
  const direct = new Map<string, Drawn[]>();
  const subtree = new Map<string, Drawn[]>();
  for (const d of outline) {
    const key = subgroupOf(d);
    if (key === "") continue;
    direct.set(key, [...(direct.get(key) ?? []), d]);
    const parts = key.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join("/");
      subtree.set(prefix, [...(subtree.get(prefix) ?? []), d]);
    }
  }
  const hatches = new Set<string>();
  const escalators: string[] = [];
  const stairs: string[] = [];
  for (const [key, members] of direct) {
    if (members.length >= HATCH_MIN_STROKES && members.every(isStrokeOnly)) hatches.add(key);
    if (!key.split("/").every((g) => isDefaultName(g))) continue;
    const all = subtree.get(key) ?? [];
    const strokes = members.filter(isStrokeOnly);
    const fills = all.filter((d) => d.paint.fill !== null);
    if (strokes.length === 3 && strokes.filter((d) => d.subpaths.every((s) => s.closed)).length === 1 && fills.length === 2 && all.length === 5) escalators.push(key);
    if (all.length === 2 && members.length === 2 && fills.length === 2 && lineColour !== null && fills.every((d) => hex(d.paint.fill!) === hex(lineColour) && d.paint.stroke === null)) {
      const [x0, y0, x1, y1] = bbox(all.flatMap((d) => d.subpaths.map((s) => s.points)));
      const [min, max] = STAIRS_SYMBOL_M;
      const w = (x1 - x0) * metresPerPx;
      const h = (y1 - y0) * metresPerPx;
      if (w >= min && w <= max && h >= min && h <= max) stairs.push(key);
    }
  }
  return { hatches, escalators, stairs };
}

export function buildLevel(loaded: LoadedLevel, frame: Frame, report: Report): { level: MapLevel | null; textIconCount: number; usedAreaIds: Set<string> } {
  const { spec, file, drawn } = loaded;
  const result = { level: null as MapLevel | null, textIconCount: 0, usedAreaIds: new Set<string>() };

  const rootGroup = drawn[0]?.groups[0];
  if (rootGroup === undefined) {
    report.error(file, null, "no drawable content");
    return result;
  }
  if (!normaliseId(rootGroup).includes(spec.id.slice(1))) report.warn(file, rootGroup, `root group is "${rootGroup}", expected the floor's number in it (${spec.id})`);

  // Background → the slab. Levels 1–2 export it as a boolean (`Subtract`) loose on the frame since 2026-10-26: accepted, with a nudge to group it.
  let background = inLayer(loaded, LAYER_GROUPS.background);
  if (!background.length) {
    background = drawn.filter((d) => d.groups.length === 1 && d.paint.fill !== null && /^(subtract|union)(_\d+)?$/i.test(d.id ?? ""));
    if (background.length) report.warn(file, background[0].id, "the slab is a boolean loose on the frame: put it in the Background group in Figma");
  }

  // Everything under the root that is not a geometry layer is text and icons: skipped, counted, and named once when it is not the Text & Icon layer.
  const stray = new Set<string>();
  for (const d of drawn) {
    if (d.groups.length >= 2 && isGeometryGroup(layerOf(d))) continue;
    if (background.includes(d)) continue;
    result.textIconCount++;
    if (d.groups.length < 2) stray.add("(loose on the frame)");
    else if (!isTextIconGroup(layerOf(d))) stray.add(d.groups[1]);
  }
  if (stray.size) {
    const names = [...stray];
    report.warn(file, null, `${stray.size} groups outside the layer groups skipped as text and icons (${names.slice(0, 4).join(", ")}${names.length > 4 ? ", …" : ""}): group them under "Text & Icon" in Figma`);
  }

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

  if (background.length !== 1) report.error(file, null, `Background must hold exactly one shape (found ${background.length})`);
  const slabFill = background[0]?.paint.fill ?? "#e4e0f8";
  // A hole drawn to the slab edge is a balcony void: a notch in the slab, and the exterior wall is cut over it (voidCuts).
  const voidCuts: [number, number, number, number][] = [];
  if (background[0]) {
    const slabPolygons = filledPolygons(background[0]).map((p) => {
      const { polygon, notched } = notchHoles(p, VOID_EDGE_EPS_PX);
      for (const ring of notched) voidCuts.push(bbox([ring]));
      return polygon;
    });
    addShape(toShape(spec.id, "slab", "slab", slabPolygons, HEIGHTS.slab, slabFill, true, frame), "slab");
  }

  // Outline: walls, flat decoration, door openings (slab-coloured patches), symbol groups.
  const outline = inLayer(loaded, LAYER_GROUPS.outline);
  const isNamedWall = (d: Drawn) => d.id !== null && /^wall(-\d+)?$/.test(normaliseId(d.id));
  // The plan's line colour: what its named walls are stroked in (the stairs symbol is filled with it).
  const lineColour = outline.find((d) => isNamedWall(d) && d.paint.stroke)?.paint.stroke ?? outline.find((d) => isStrokeOnly(d) && d.paint.strokeWidth >= WALL_MIN_STROKE_PX)?.paint.stroke ?? null;
  const { hatches, escalators, stairs } = classifySubgroups(outline, frame.metresPerPx, lineColour);
  const isDoorPatch = (d: Drawn) => !isNamedWall(d) && d.paint.fill !== null && hex(d.paint.fill) === hex(slabFill);
  const doorCuts = outline.filter(isDoorPatch).map((d) => bbox(d.subpaths.map((s) => s.points)));
  // Column markers: small stroke-only closed boxes on the floor. Noise in 3D, so they are dropped.
  const isColumnMarker = (d: Drawn) => {
    if (!isStrokeOnly(d) || !d.subpaths.every((s) => s.closed)) return false;
    const [x0, y0, x1, y1] = bbox(d.subpaths.map((s) => s.points));
    return Math.max(x1 - x0, y1 - y0) * frame.metresPerPx < COLUMN_MARKER_MAX_M;
  };
  // Label frames: stroke-only closed boxes centred outside the floor (the "JASMINE 1 / 2" tabs on the top edge), or drawn against a
  // colour box's edge (the "LOTUS 1 / 2 / 3" tabs on the halls; Scott, 2026-10-27). Dropped, like their text.
  const slabRing = background[0]?.subpaths.find((s) => s.closed)?.points ?? [];
  const areaBoxes = inLayer(loaded, LAYER_GROUPS.colourBox).map((d) => bbox(d.subpaths.map((s) => s.points)));
  const abutsArea = ([x0, y0, x1, y1]: [number, number, number, number]) =>
    areaBoxes.some(([ax0, ay0, ax1, ay1]) => {
      const alongX = x0 < ax1 - LABEL_TAB_TOL_PX && x1 > ax0 + LABEL_TAB_TOL_PX;
      const alongY = y0 < ay1 - LABEL_TAB_TOL_PX && y1 > ay0 + LABEL_TAB_TOL_PX;
      return (alongX && (Math.abs(y1 - ay0) <= LABEL_TAB_TOL_PX || Math.abs(y0 - ay1) <= LABEL_TAB_TOL_PX)) || (alongY && (Math.abs(x1 - ax0) <= LABEL_TAB_TOL_PX || Math.abs(x0 - ax1) <= LABEL_TAB_TOL_PX));
    });
  // The 2D outline ring: one closed stroke drawn around the whole slab, outside it. Not a wall in 3D (Scott, 2026-10-26).
  const slabBox = slabRing.length ? bbox([slabRing]) : null;
  const isOutlineRing = (d: Drawn) => {
    if (!slabBox || !isStrokeOnly(d) || d.subpaths.length !== 1 || !d.subpaths[0].closed) return false;
    const [x0, y0, x1, y1] = bbox(d.subpaths.map((s) => s.points));
    return slabBox[0] - x0 >= OUTLINE_RING_MIN_PX && slabBox[1] - y0 >= OUTLINE_RING_MIN_PX && x1 - slabBox[2] >= OUTLINE_RING_MIN_PX && y1 - slabBox[3] >= OUTLINE_RING_MIN_PX;
  };
  // The exterior wall: a named wall drawn on the slab's edge (its box is the slab's). Cut over the balcony voids, by half its width, so each void opens onto the floor below (Scott, 2026-10-26).
  const isExteriorWall = (d: Drawn) => {
    if (!slabBox || !isNamedWall(d)) return false;
    const [x0, y0, x1, y1] = bbox(d.subpaths.map((s) => s.points));
    return Math.abs(x0 - slabBox[0]) <= EXTERIOR_WALL_TOL_PX && Math.abs(y0 - slabBox[1]) <= EXTERIOR_WALL_TOL_PX && Math.abs(x1 - slabBox[2]) <= EXTERIOR_WALL_TOL_PX && Math.abs(y1 - slabBox[3]) <= EXTERIOR_WALL_TOL_PX;
  };
  const isLabelFrame = (d: Drawn) => {
    if (!isStrokeOnly(d) || !d.subpaths.every((s) => s.closed) || !slabRing.length) return false;
    const box = bbox(d.subpaths.map((s) => s.points));
    return !pointInRing([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2], slabRing) || abutsArea(box);
  };
  // Unnamed walls, on a floor that names no interior wall: the plan's wall strokes, outside any hatch and not a hatch in one path (a stair run of many short strokes). A floor that names its interior walls has only those (Level 3's hall-name tabs are drawn at wall width too); naming only the rings (Level 2 since 2026-10-26) does not switch the fallback off.
  const namesWalls = outline.some((d) => isNamedWall(d) && !isOutlineRing(d) && !isExteriorWall(d));
  const isImplicitWall = (d: Drawn) => !namesWalls && isStrokeOnly(d) && d.paint.strokeWidth >= WALL_MIN_STROKE_PX && !hatches.has(subgroupOf(d)) && d.subpaths.length < HATCH_MIN_STROKES;
  /** The named subgroup an element sits in (first named ancestor below the layer, at any depth), or the unnamed escalator symbol it belongs to. */
  const namedGroupOf = (d: Drawn) => d.groups.slice(2).find((g) => !isDefaultName(g)) ?? null;
  const namedCount = (areaId: string) => new Set(outline.map(namedGroupOf).filter((g): g is string => g !== null && parseName(g).areaId === areaId)).size;
  const namedEscalatorCount = namedCount("escalator");
  const namedStairsCount = namedCount("stairs");
  const symbolOf = (d: Drawn): string | null => {
    const named = namedGroupOf(d);
    if (named !== null) return named;
    const key = subgroupOf(d);
    const e = escalators.findIndex((g) => key === g || key.startsWith(`${g}/`));
    if (e !== -1) return `escalator-${namedEscalatorCount + e + 1}`;
    const s = stairs.findIndex((g) => key === g || key.startsWith(`${g}/`));
    return s === -1 ? null : `stairs-${namedStairsCount + s + 1}`;
  };

  let wallN = 0;
  let decoN = 0;
  let columns = 0;
  let frames = 0;
  let rings = 0;
  const addWall = (d: Drawn) => {
    const half = d.paint.strokeWidth / 2;
    const cuts = isExteriorWall(d) ? [...doorCuts, ...voidCuts.map(([x0, y0, x1, y1]): [number, number, number, number] => [x0 - half, y0 - half, x1 + half, y1 + half])] : doorCuts;
    addShape(toShape(spec.id, `wall-${++wallN}`, "wall", strokedPolygons(d, cuts), HEIGHTS.wall, slabFill, true, frame), d.id);
  };
  const addDeco = (d: Drawn, groupName: string) => {
    if (d.paint.fill) addShape(toShape(spec.id, `${groupName}-${++decoN}`, "deco", filledPolygons(d), HEIGHTS.deco, d.paint.fill, false, frame), d.id);
    if (d.paint.stroke) addShape(toShape(spec.id, `${groupName}-${++decoN}`, "deco", strokedPolygons(d, []), HEIGHTS.deco, d.paint.stroke, false, frame), d.id);
  };
  const symbolGroups = new Map<string, Drawn[]>();
  for (const d of outline) {
    if (isOutlineRing(d)) {
      rings++;
      continue;
    }
    if (isNamedWall(d)) {
      if (!d.paint.stroke) {
        report.error(file, d.id, "a wall must be a stroked line (no fill)");
        continue;
      }
      // Walls take the slab colour, drawn by their edge lines (Scott, 2026-10-25); the plan's stroke colour is ignored.
      addWall(d);
      continue;
    }
    if (isDoorPatch(d)) continue;
    // A named Outline subgroup (escalator, escalator_2, stairs) or an unnamed escalator symbol: a place drawn as a diagram, resolved below.
    const symbol = symbolOf(d);
    if (symbol !== null) {
      symbolGroups.set(symbol, [...(symbolGroups.get(symbol) ?? []), d]);
      continue;
    }
    if (isColumnMarker(d)) {
      columns++;
      continue;
    }
    if (isLabelFrame(d)) {
      frames++;
      continue;
    }
    if (isImplicitWall(d)) {
      addWall(d);
      continue;
    }
    addDeco(d, "deco");
  }
  if (rings > 1) report.warn(file, null, `${rings} outline rings around the slab dropped; expected at most one`);
  report.info(file, null, `${doorCuts.length} door openings cut from ${wallN} walls; ${voidCuts.length} balcony voids opened on the slab edge; ${columns} column markers, ${frames} label frames and ${rings} outline ring dropped; ${hatches.size} hatches flat; ${escalators.length} escalator and ${stairs.length} stairs symbols found by structure`);

  // Symbol groups → hidden areas over their bounding box (the sprite stands there, nothing is drawn), or flat decoration while the catalogue entry has no icon yet.
  const { usedAreaIds } = result;
  for (const [groupName, items] of symbolGroups) {
    const { id, areaId, instance } = parseName(groupName);
    if (!isAreaId(areaId)) {
      report.error(file, groupName, `named Outline group has no catalogue entry "${areaId}" (data/areas.ts)`);
      continue;
    }
    const entry: AreaSpec = AREAS[areaId];
    usedAreaIds.add(areaId);
    const variant = instance === null ? undefined : entry.variants?.[instance];
    if (!(variant?.icon ?? entry.icon)) {
      for (const d of items) addDeco(d, id);
      report.info(file, groupName, `"${entry.name}" has no icon yet: drawn as the plan's symbol, not tappable`);
      continue;
    }
    const [x0, y0, x1, y1] = bbox(items.flatMap((d) => d.subpaths.map((s) => s.points)));
    const rect: Polygon = { outer: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], holes: [] };
    addShape(toShape(spec.id, id, "area", [rect], HEIGHTS[variant?.heightClass ?? entry.heightClass], slabFill, false, frame, { areaId, hidden: true, ...(instance === null ? {} : { instance }) }), groupName);
    report.info(file, groupName, `drawn as its sprite (${items.length} paths hidden)`);
  }

  // Colour boxes → areas, joined to the catalogue.
  for (const d of inLayer(loaded, LAYER_GROUPS.colourBox)) {
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
    const before = bbox(d.subpaths.map((s) => s.points));
    const polygons = filledPolygons(d, entry.minWidth ? entry.minWidth / frame.metresPerPx : 0);
    const after = bbox(polygons.flatMap((p) => [p.outer, ...p.holes]));
    if (entry.minWidth && (after[2] - after[0] - (before[2] - before[0]) > 1e-6 || after[3] - after[1] - (before[3] - before[1]) > 1e-6)) report.info(file, d.id, `widened to ${entry.minWidth} m`);
    const variant = instance === null ? undefined : entry.variants?.[instance];
    addShape(toShape(spec.id, id, "area", polygons, HEIGHTS[variant?.heightClass ?? entry.heightClass], d.paint.fill, true, frame, { areaId, ...(instance === null ? {} : { instance }) }), d.id);
  }

  // An area drawn inside another (the tea & coffee stand in the Co-work Area) stands on it: coplanar caps z-fight otherwise.
  const areaShapes = shapes.filter((s) => s.kind === "area");
  for (const inner of areaShapes) {
    const container = areaShapes
      .filter((o) => o !== inner && area(o.polygons[0].outer) > area(inner.polygons[0].outer) && o.polygons.some((p) => pointInRing(inner.anchor, p.outer)))
      .sort((a, b) => area(a.polygons[0].outer) - area(b.polygons[0].outer))[0];
    if (!container) continue;
    inner.base = round((container.base ?? 0) + container.height + NESTED_LIFT);
    report.info(file, inner.id, `stands on ${container.id} (base ${inner.base} m)`);
  }

  const slab = shapes.find((s) => s.kind === "slab");
  const b = slab ? slab.bbox : bbox(shapes.flatMap((s) => s.polygons.flatMap((p) => [p.outer, ...p.holes])));
  result.level = {
    id: spec.id,
    label: spec.label,
    name: spec.name,
    units: { metresPerPlanPx: round(frame.metresPerPx * 1000) / 1000, viewBox: loaded.viewBox, offset: [round(frame.offset[0]), round(frame.offset[1])] },
    bounds: { minX: b[0], minZ: b[1], maxX: b[2], maxZ: b[3] },
    shapes,
  };
  return result;
}

export function buildBundle(report: Report): MapBundle | null {
  const loaded = LEVELS.map((spec) => loadLevel(spec, report));
  // Register every floor on the reference floor (register.ts).
  const inputs = Object.fromEntries(loaded.map((l) => [l.spec.id, { marks: registrationMarks(l), metaScale: metaScale(l, report) } satisfies RegistrationInput])) as Record<string, RegistrationInput>;
  if (!(REFERENCE_LEVEL in inputs)) {
    report.error("data/levels.ts", REFERENCE_LEVEL, "the reference floor (config REFERENCE_LEVEL) is not in LEVELS");
    return null;
  }
  const frames = registerFrames(inputs, REFERENCE_LEVEL, FALLBACK_METRES_PER_PX);

  const levels: MapLevel[] = [];
  const used = new Set<string>();
  for (const l of loaded) {
    const { frame, note, warning } = frames[l.spec.id];
    if (warning) report.warn(l.file, null, warning);
    report.info(l.file, null, `scale ${frame.metresPerPx.toFixed(5)} m/px, ${note}`);
    const { level, textIconCount, usedAreaIds } = buildLevel(l, frame, report);
    for (const id of usedAreaIds) used.add(id);
    if (!level) continue;
    report.info(l.file, null, `${level.shapes.length} shapes (${level.shapes.filter((s) => s.kind === "area").length} areas, ${level.shapes.filter((s) => s.kind === "wall").length} walls, ${level.shapes.filter((s) => s.kind === "deco").length} deco); text and icons skipped (${textIconCount} paths)`);
    levels.push(level);
  }
  // Catalogue entries unused on every floor are an error (a stale entry, or a layer named wrong).
  for (const areaId of Object.keys(AREAS)) if (!used.has(areaId)) report.error("data/areas.ts", areaId, "catalogue entry matches no layer on any floor");
  // Icons must exist.
  for (const [areaId, entry] of Object.entries(AREAS) as [string, AreaSpec][]) {
    const icons = [entry.icon, ...Object.values(entry.icons ?? {}), ...Object.values(entry.variants ?? {}).map((v) => v.icon)].flatMap((i) => (i ? [i] : []));
    for (const icon of icons) if (!fs.existsSync(path.join(ICONS_DIR, `${icon}.png`))) report.error("data/areas.ts", areaId, `icon "${icon}" has no PNG under public/maps/devcon-8/icons`);
  }
  if (!levels.length) return null;
  const bounds: GroundBounds = levels.reduce(
    (acc, l) => ({ minX: Math.min(acc.minX, l.bounds.minX), minZ: Math.min(acc.minZ, l.bounds.minZ), maxX: Math.max(acc.maxX, l.bounds.maxX), maxZ: Math.max(acc.maxZ, l.bounds.maxZ) }),
    { minX: Infinity, minZ: Infinity, maxX: -Infinity, maxZ: -Infinity }
  );
  const bundle: MapBundle = { version: 3, bounds, levels };
  const parsed = mapBundleSchema.safeParse(bundle);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) report.error("bundle", null, `${issue.path.join(".")}: ${issue.message}`);
    return null;
  }
  return bundle;
}

/**
 * `{ roomId: AreaKey[] }` for roomAreas.ts: every schedule room's footprints. The Pretalx rooms come
 * from ROOMS; a Community Hub's room (`community-hub-<hub id>`, the hubs' programme) is the booth the
 * catalogue seats the hub at (`hubs` on an area), so hub sessions link to the map too (Scott, 2026-10-27).
 */
export function buildRooms(bundle: MapBundle, report: Report): Record<string, string[]> {
  const keys = new Set(bundle.levels.flatMap((l) => l.shapes.filter((s) => s.kind === "area").map((s) => s.key)));
  const entries: [string, readonly { areaId: string; instance?: number }[]][] = Object.entries(ROOMS);
  for (const [areaId, spec] of Object.entries(AREAS as Record<string, AreaSpec>)) for (const [instance, hubId] of Object.entries(spec.hubs ?? {})) entries.push([`${COMMUNITY_HUB_ROOM_PREFIX}${hubId}`, [{ areaId, instance: Number(instance) }]]);
  const out: Record<string, string[]> = {};
  for (const [roomId, refs] of entries) {
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
