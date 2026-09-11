#!/usr/bin/env node
/**
 * Builds the "plan" 3D scene from a top-down floor-plan SVG whose shapes are
 * named footprints (rects and axis-aligned paths).
 *
 *   pnpm map:build:plan [plan.svg]
 *
 * Input:  public/maps/devcon-8/source/top-down-geometry-test.svg
 * Output: src/app/(page-layout)/map/venue-map-3d/plan.generated.json
 *
 * Every shape becomes an extruded footprint; heights come from a name-prefix
 * table (the plan has no heights) and colours from the shape fills. The
 * first shape is treated as the slab (extruded downwards). Coordinates are
 * scaled into the same ground-pixel unit the isometric scene uses so the
 * camera rig and materials behave identically for both sources.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sourcePath = process.argv[2] ?? path.join(root, "public/maps/devcon-8/source/top-down-geometry-test.svg");
const outPath = path.join(root, "src/app/(page-layout)/map/venue-map-3d/plan.generated.json");
const areas = JSON.parse(fs.readFileSync(path.join(root, "src/app/(page-layout)/map/venue-map-3d/areas.json"), "utf8"));

/** Plan px → ground px (the isometric floor is ~2500 ground px across; this plan is 1438 wide). */
const PLAN_SCALE = 1.75;
const SLAB_DEPTH = 8;

/** Heights in plan px by id prefix; the plan carries no heights. First match wins. */
const HEIGHTS = [
  [/^wall/i, 16],
  [/^main-stage/i, 48],
  [/^st(a)?ge-/i, 48],
  [/^classroom/i, 38],
  [/^toilets/i, 30],
  [/^press-room/i, 30],
  [/^cowork/i, 32],
  [/discussion-corner|community-hub|coffee-station|snack/i, 2],
];
const heightFor = (id) => HEIGHTS.find(([re]) => re.test(id))?.[1] ?? 30;

/** Icon sprite (public/maps/devcon-8/icons/<name>.png) shown at each footprint's centre. */
const ICONS = [
  [/^stage-1/i, "fan"],
  [/^stage-2/i, "lantern"],
  [/^st(a)?ge-3/i, "mats"],
  [/^stage-4/i, "leaf"],
  [/^stage-5/i, "hat"],
  [/^stage-6/i, "kite"],
  [/^main-stage/i, "mask"],
  [/coffee-station/i, "coffee"],
  [/community-hub/i, "community-hub"],
  [/^cowork/i, "cowork"],
  [/discussion-corner/i, "discussion-corner"],
  [/^toilets/i, "toilets"],
  [/impact/i, "impact"],
  [/snack/i, "snack"],
];
const iconFor = (id) => ICONS.find(([re]) => re.test(id))?.[1] ?? null;
const iconFiles = new Set(fs.readdirSync(path.join(root, "public/maps/devcon-8/icons")).map((f) => f.replace(/\.png$/, "")));
const kindFor = (id, height) => (height <= 3 ? "mat" : /^wall/i.test(id) ? "wall" : "block");

// ---------------------------------------------------------------------------

function parseAttrs(raw) {
  const attrs = {};
  const re = /([\w:-]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(raw))) attrs[m[1]] = m[2];
  return attrs;
}

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/** Absolute M/L/H/V/C/Z path → list of closed polygons (curves flattened). */
function pathToPolygons(d) {
  const toks = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const polys = [];
  let pts = [];
  let cur = [0, 0];
  let cmd = null;
  let i = 0;
  const num = () => Number(toks[i++]);
  while (i < toks.length) {
    const t = toks[i];
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === "Z" || cmd === "z") {
        if (pts.length >= 3) polys.push(pts);
        pts = [];
      }
      continue;
    }
    if (cmd === "M") {
      if (pts.length >= 3) polys.push(pts);
      pts = [];
      cur = [num(), num()];
      pts.push(cur);
      cmd = "L";
    } else if (cmd === "L") {
      cur = [num(), num()];
      pts.push(cur);
    } else if (cmd === "H") {
      cur = [num(), cur[1]];
      pts.push(cur);
    } else if (cmd === "V") {
      cur = [cur[0], num()];
      pts.push(cur);
    } else if (cmd === "C") {
      const p1 = [num(), num()];
      const p2 = [num(), num()];
      const p3 = [num(), num()];
      for (let k = 1; k <= 6; k++) pts.push(cubic(cur, p1, p2, p3, k / 6));
      cur = p3;
    } else {
      i++;
    }
  }
  if (pts.length >= 3) polys.push(pts);
  return polys;
}

/** Area-weighted centroid of a simple polygon (falls back to the vertex mean for degenerate input). */
function polygonCentroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    a += f;
    cx += (poly[j][0] + poly[i][0]) * f;
    cy += (poly[j][1] + poly[i][1]) * f;
  }
  if (Math.abs(a) < 1e-6) return [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  return [cx / (3 * a), cy / (3 * a)];
}

function polygonArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a / 2);
}

function humanise(id) {
  return id
    .replace(/^stge-/i, "stage-")
    .replace(/-mask$/i, "")
    .split("-")
    .map((w) => (w.length <= 1 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/** areas.json entry for a plan id: exact id, then the normalised stage/classroom id. */
function areaFor(id) {
  const lower = id.toLowerCase().replace(/^stge-/, "stage-").replace(/-mask$/, "");
  const stage = /^(stage-\d+)/.exec(lower)?.[1];
  const candidates = [id, lower, stage, lower.startsWith("main-stage") ? "main-stage" : null, lower.replace(/-\d+$/, "")].filter(Boolean);
  for (const c of candidates) {
    const hit = areas.find((a) => a.id === c);
    if (hit) return hit;
  }
  return null;
}

// ---------------------------------------------------------------------------

const svg = fs.readFileSync(sourcePath, "utf8");
const viewBox = /viewBox="([^"]+)"/.exec(svg)[1].split(/\s+/).map(Number);
const shapes = [];
const round = (v) => Math.round(v * 10) / 10;
let first = true;
for (const m of svg.matchAll(/<(rect|path)([^>]*)\/>/g)) {
  const [, tag, raw] = m;
  const a = parseAttrs(raw);
  const id = a.id ?? `shape-${shapes.length}`;
  let polygons;
  if (tag === "rect") {
    const x = Number(a.x ?? 0), y = Number(a.y ?? 0), w = Number(a.width), h = Number(a.height);
    polygons = [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]];
  } else {
    polygons = pathToPolygons(a.d);
  }
  // Ground px: plan x → X, plan y → Z (same handedness as the isometric floor).
  const ground = polygons.map((poly) => poly.map(([x, y]) => [round(x * PLAN_SCALE), round(y * PLAN_SCALE)]));
  const isSlab = first;
  first = false;
  const height = isSlab ? SLAB_DEPTH : heightFor(id);
  const area = isSlab ? null : areaFor(id);
  const kind = isSlab ? "slab" : kindFor(id, height);
  const outline = [...ground].sort((p, q) => polygonArea(q) - polygonArea(p))[0];
  const icon = isSlab || /^wall/i.test(id) ? null : iconFor(id);
  if (icon && !iconFiles.has(icon)) console.warn(`  ! no icon file for "${icon}" (${id})`);
  shapes.push({
    id,
    kind,
    name: area?.name ?? humanise(id),
    description: area?.description ?? "",
    tappable: kind === "block" || kind === "mat",
    polygons: ground,
    centroid: polygonCentroid(outline).map(round),
    icon: icon && iconFiles.has(icon) ? icon : null,
    height: round(height * PLAN_SCALE),
    fill: a.fill ?? "#cccccc",
    stroke: a.stroke ?? null,
  });
}

const all = shapes.flatMap((s) => s.polygons.flat());
const bounds = {
  minX: Math.min(...all.map((p) => p[0])),
  maxX: Math.max(...all.map((p) => p[0])),
  minZ: Math.min(...all.map((p) => p[1])),
  maxZ: Math.max(...all.map((p) => p[1])),
};
// Screen extent of the floor in the start (isometric) view, in the same px unit: u = (X − Z)cos30°, v = (X + Z)/2.
const corners = [[bounds.minX, bounds.minZ], [bounds.maxX, bounds.minZ], [bounds.minX, bounds.maxZ], [bounds.maxX, bounds.maxZ]];
const us = corners.map(([x, z]) => (x - z) * Math.cos(Math.PI / 6));
const vs = corners.map(([x, z]) => (x + z) / 2);
const fit = { width: round(Math.max(...us) - Math.min(...us)), height: round(Math.max(...vs) - Math.min(...vs)) };

const out = { source: "plan", generatedFrom: path.relative(root, sourcePath), viewBox, planScale: PLAN_SCALE, bounds, fit, shapes };
fs.writeFileSync(outPath, JSON.stringify(out));

console.log(`${path.relative(root, sourcePath)} → ${path.relative(root, outPath)} (${(Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0)} KB)`);
console.log(`shapes: ${shapes.length}; by kind:`, Object.fromEntries(["slab", "wall", "block", "mat"].map((k) => [k, shapes.filter((s) => s.kind === k).length])));
console.log(`bounds (ground px):`, bounds, `fit (screen px):`, fit);
for (const s of shapes) if (s.kind !== "wall") console.log(`  ${s.kind.padEnd(5)} ${s.id.padEnd(26)} h=${s.height} icon=${(s.icon ?? "-").padEnd(17)} → "${s.name}"${s.description ? "" : "  (no description)"}`);
