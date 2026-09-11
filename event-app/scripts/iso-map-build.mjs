#!/usr/bin/env node
/**
 * Builds the 3D venue-map scene description from the Figma isometric SVG.
 *
 *   pnpm map:build [source.svg]
 *
 * Input:  public/maps/devcon-8/source/TEST-Iso-SVG-Map.svg (Figma export of
 *         node 5795:35828 with "Include id attribute" ticked)
 * Output: src/app/(page-layout)/map/venue-map-3d/scene.generated.json
 *
 * What it does (see the plan in the PR description for the why):
 *  - flattens linear gradients to their average stop colour and drops masks,
 *    neither of which three's SVGLoader supports;
 *  - rounds path coordinates to one decimal;
 *  - splits the drawing into the flat "slab" (Base-Layer + the unnamed flat
 *    patches of Floor-Layer) and upright "props" (every named group of
 *    Floor-Layer / Decoration-Layer, plus anonymous groups), each as its own
 *    small SVG string so the runtime can place them independently;
 *  - resolves the room blocks named in areas.json (by a seed point inside the
 *    block's top face) to { top face, height } using the zero-width vertical
 *    edge lines Figma exported next to each face, and removes the painted
 *    faces from the slab so a real 3D box can take their place.
 *
 * The JSON is imported statically by the map pane, so it ships inside the JS
 * chunk (no runtime fetch → works offline under the service worker, like the
 * old inlined map SVG did).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sourcePath =
  process.argv[2] ??
  path.join(root, "public/maps/devcon-8/source/TEST-Iso-SVG-Map.svg");
const outDir = path.join(root, "src/app/(page-layout)/map/venue-map-3d");
const areasPath = path.join(outDir, "areas.json");
const outPath = path.join(outDir, "scene.generated.json");

const DEFAULT_BLOCK_HEIGHT = 60; // px, used when no vertical edge is found
const ISO_DIRS = [30, 150]; // top-face edge directions (degrees, screen space)

// ---------------------------------------------------------------------------
// Minimal SVG tree parser (Figma output is well-formed and only uses a handful
// of elements, so a tag tokenizer is enough — no XML dependency needed).
// ---------------------------------------------------------------------------

function parseSvg(text) {
  const tagRe = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  const rootNode = { type: "#root", attrs: {}, children: [] };
  const stack = [rootNode];
  let m;
  while ((m = tagRe.exec(text))) {
    const [, closing, name, rawAttrs, selfClosing] = m;
    if (closing) {
      stack.pop();
      continue;
    }
    const attrs = {};
    const attrRe = /([\w:-]+)="([^"]*)"/g;
    let a;
    while ((a = attrRe.exec(rawAttrs))) attrs[a[1]] = a[2];
    const node = { type: name, attrs, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
  }
  return rootNode;
}

function serialize(node) {
  if (node.type === "#root") return node.children.map(serialize).join("");
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");
  if (node.children.length === 0) return `<${node.type}${attrs}/>`;
  return `<${node.type}${attrs}>${node.children.map(serialize).join("")}</${node.type}>`;
}

function* walk(node) {
  yield node;
  for (const child of node.children) yield* walk(child);
}

function findById(node, id) {
  for (const n of walk(node)) if (n.attrs.id === id) return n;
  return null;
}

// ---------------------------------------------------------------------------
// Gradients → flat colour
// ---------------------------------------------------------------------------

function parseColor(c) {
  if (!c) return null;
  if (c === "white") return [255, 255, 255];
  if (c === "black") return [0, 0, 0];
  const hex = c.replace("#", "");
  if (hex.length === 3)
    return hex.split("").map((h) => parseInt(h + h, 16));
  if (hex.length === 6)
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return null;
}

function toHex([r, g, b]) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function averageGradient(gradientNode) {
  const stops = gradientNode.children.filter((c) => c.type === "stop");
  const cols = [];
  let opacity = 0;
  for (const s of stops) {
    const col = parseColor(s.attrs["stop-color"]);
    if (!col) continue;
    cols.push(col);
    opacity += s.attrs["stop-opacity"] != null ? Number(s.attrs["stop-opacity"]) : 1;
  }
  if (cols.length === 0) return { color: "#888888", opacity: 1 };
  const avg = [0, 1, 2].map((i) => cols.reduce((a, c) => a + c[i], 0) / cols.length);
  return { color: toHex(avg), opacity: opacity / cols.length };
}

// ---------------------------------------------------------------------------
// Path geometry helpers (Figma emits absolute M/L/H/V/C/Z only)
// ---------------------------------------------------------------------------

const NUM_RE = /-?\d*\.?\d+(?:e-?\d+)?/g;

function roundD(d) {
  return d.replace(NUM_RE, (n) => {
    const v = Math.round(Number(n) * 10) / 10;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  });
}

/** Vertices of straight-edged subpaths; `curved` is true if any curve exists. */
function pathInfo(d) {
  const toks = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const subpaths = [];
  let pts = [];
  let cur = [0, 0];
  let cmd = null;
  let curved = false;
  let i = 0;
  const xs = [];
  const ys = [];
  const push = (p) => {
    cur = p;
    pts.push(p);
    xs.push(p[0]);
    ys.push(p[1]);
  };
  while (i < toks.length) {
    const t = toks[i];
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === "Z" || cmd === "z") {
        if (pts.length) subpaths.push(pts);
        pts = [];
      }
      if ("CcQqAaSs".includes(cmd)) curved = true;
      continue;
    }
    if (cmd === "M") {
      if (pts.length) subpaths.push(pts);
      pts = [];
      push([Number(toks[i]), Number(toks[i + 1])]);
      i += 2;
      cmd = "L";
    } else if (cmd === "L") {
      push([Number(toks[i]), Number(toks[i + 1])]);
      i += 2;
    } else if (cmd === "V") {
      push([cur[0], Number(toks[i])]);
      i += 1;
    } else if (cmd === "H") {
      push([Number(toks[i]), cur[1]]);
      i += 1;
    } else if (cmd === "C") {
      for (let k = 0; k < 6; k += 2) {
        xs.push(Number(toks[i + k]));
        ys.push(Number(toks[i + k + 1]));
      }
      push([Number(toks[i + 4]), Number(toks[i + 5])]);
      i += 6;
    } else {
      i++;
    }
  }
  if (pts.length) subpaths.push(pts);
  const bbox =
    xs.length > 0
      ? [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]
      : null;
  return { subpaths, bbox, curved };
}

function dedupe(pts) {
  const out = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.5) out.push(p);
  }
  if (out.length > 1) {
    const [f, l] = [out[0], out[out.length - 1]];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 0.5) out.pop();
  }
  return out;
}

function edgeAngle(a, b) {
  return (((Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI) % 180 + 180) % 180;
}

function near(angle, target, tol = 4) {
  const d = Math.abs(angle - target);
  return d <= tol || Math.abs(d - 180) <= tol;
}

/** A closed 4-vertex polygon whose edges alternate 30°/150° = an iso top face. */
function isTopFace(pts) {
  const q = dedupe(pts);
  if (q.length !== 4) return false;
  return q.every((p, i) => {
    const a = edgeAngle(p, q[(i + 1) % 4]);
    return ISO_DIRS.some((dir) => near(a, dir));
  });
}

/**
 * A 6-vertex polygon with two vertical edges = the silhouette of an iso box
 * drawn as one shape (Figma does this for the classrooms and the cowork desk).
 * Returns the top parallelogram (ring order) and the height, or null.
 */
function silhouetteToBox(pts) {
  const q = dedupe(pts);
  if (q.length !== 6) return null;
  const verticals = [];
  for (let i = 0; i < 6; i++) {
    const a = q[i];
    const b = q[(i + 1) % 6];
    const ang = edgeAngle(a, b);
    if (near(ang, 90)) verticals.push(a[1] < b[1] ? { top: a, h: b[1] - a[1] } : { top: b, h: a[1] - b[1] });
    else if (!ISO_DIRS.some((dir) => near(ang, dir))) return null;
  }
  if (verticals.length !== 2) return null;
  const tops = verticals.map((v) => v.top);
  const height = (verticals[0].h + verticals[1].h) / 2;
  const p0 = q.filter((p) => !tops.includes(p)).reduce((a, b) => (b[1] < a[1] ? b : a));
  const [left, right] = tops[0][0] < tops[1][0] ? tops : [tops[1], tops[0]];
  const p2 = [left[0] + right[0] - p0[0], left[1] + right[1] - p0[1]];
  return { top: [p0, right, p2, left], height };
}

function pointInPolygon([px, py], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function bboxOf(nodes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) {
    for (const p of walk(n)) {
      if (p.type !== "path" || !p.attrs.d) continue;
      const { bbox } = pathInfo(p.attrs.d);
      if (!bbox) continue;
      x0 = Math.min(x0, bbox[0]);
      y0 = Math.min(y0, bbox[1]);
      x1 = Math.max(x1, bbox[0] + bbox[2]);
      y1 = Math.max(y1, bbox[1] + bbox[3]);
    }
  }
  return x0 === Infinity ? null : [x0, y0, x1 - x0, y1 - y0].map((v) => Math.round(v * 10) / 10);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const source = fs.readFileSync(sourcePath, "utf8");
const areas = JSON.parse(fs.readFileSync(areasPath, "utf8"));
const tree = parseSvg(source);
const svg = tree.children.find((c) => c.type === "svg");
if (!svg) throw new Error("no <svg> root");
const viewBox = svg.attrs.viewBox.split(/\s+/).map(Number);

// 1. gradients → colours, drop masks, round coordinates
const gradients = new Map();
for (const n of walk(svg)) {
  if (n.type === "linearGradient" || n.type === "radialGradient") gradients.set(n.attrs.id, averageGradient(n));
}
let gradientRefs = 0;
for (const n of walk(svg)) {
  for (const key of ["fill", "stroke"]) {
    const v = n.attrs[key];
    const ref = v && /^url\(#(.+)\)$/.exec(v);
    if (!ref) continue;
    const g = gradients.get(ref[1]);
    if (!g) continue;
    n.attrs[key] = g.color;
    if (g.opacity < 0.999 && n.attrs[`${key}-opacity`] == null) n.attrs[`${key}-opacity`] = g.opacity.toFixed(2);
    gradientRefs++;
  }
  if (n.attrs.mask) delete n.attrs.mask;
  if (n.type === "path" && n.attrs.d) n.attrs.d = roundD(n.attrs.d);
}
svg.children = svg.children.filter((c) => c.type !== "defs");
// Figma writes each <mask> inline next to the group it clips; SVGLoader would
// paint its white luminance shape as a plate, so the definitions go too. The
// clipping itself is not reproduced (prototype: content shows unclipped).
let masksDropped = 0;
for (const n of walk(svg)) {
  const before = n.children.length;
  n.children = n.children.filter((c) => c.type !== "mask" && c.type !== "clipPath");
  masksDropped += before - n.children.length;
}

const baseLayer = findById(svg, "Base-Layer");
const floorLayer = findById(svg, "Floor-Layer");
const decoLayer = findById(svg, "Decoration-Layer");
if (!baseLayer || !floorLayer || !decoLayer) throw new Error("expected Base-Layer, Floor-Layer and Decoration-Layer groups");

// 2. blocks: seeds in areas.json → top face + height
const basePaths = [...walk(baseLayer)].filter((n) => n.type === "path" && n.attrs.d);
const baseInfo = new Map(basePaths.map((p) => [p, pathInfo(p.attrs.d)]));
const verticalEdges = [];
for (const p of basePaths) {
  const { subpaths, curved } = baseInfo.get(p);
  if (curved || subpaths.length !== 1) continue;
  const q = dedupe(subpaths[0]);
  if (q.length === 2 && Math.abs(q[0][0] - q[1][0]) < 0.6) {
    const top = q[0][1] < q[1][1] ? q[0] : q[1];
    verticalEdges.push({ x: top[0], y: top[1], h: Math.abs(q[1][1] - q[0][1]) });
  }
}
const topFaces = basePaths
  .filter((p) => (p.attrs.fill ?? "none") !== "none")
  .map((p) => ({ node: p, ...baseInfo.get(p) }))
  .filter((f) => !f.curved && f.subpaths.length === 1)
  .flatMap((f) => {
    const poly = dedupe(f.subpaths[0]);
    if (isTopFace(poly)) return [{ ...f, kind: "top", poly, top: poly, height: null }];
    const box = silhouetteToBox(poly);
    if (box) return [{ ...f, kind: "silhouette", poly, top: box.top, height: box.height }];
    return [];
  });

const blocks = [];
const unresolved = [];
const removed = new Set();
for (const area of areas) {
  if (!area.seed) continue;
  const hits = topFaces.filter((f) => pointInPolygon(area.seed, f.poly));
  if (hits.length === 0) {
    unresolved.push(`${area.id}: no top face contains seed ${area.seed.join(",")}`);
    continue;
  }
  hits.sort((a, b) => a.bbox[2] * a.bbox[3] - b.bbox[2] * b.bbox[3]);
  const face = hits[0];
  const heights = face.height != null ? [face.height] : [];
  if (!heights.length) {
    for (const v of face.top) {
      for (const e of verticalEdges) if (Math.hypot(e.x - v[0], e.y - v[1]) <= 3) heights.push(e.h);
    }
  }
  const height = heights.length ? Math.max(...heights) : area.height ?? DEFAULT_BLOCK_HEIGHT;
  if (!heights.length) unresolved.push(`${area.id}: no vertical edge at the top face, using height ${height}`);
  blocks.push({
    id: area.id,
    kind: face.kind,
    top: face.top.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]),
    height: Math.round(height * 10) / 10,
    fill: face.node.attrs.fill,
    stroke: face.node.attrs.stroke ?? null,
    sourceId: face.node.attrs.id,
  });
  removed.add(face.node);
}

// 3. remove painted faces/edges that sit inside a block's zone (top bbox extended down by height)
const zones = blocks.map((b) => {
  const xs = b.top.map((p) => p[0]);
  const ys = b.top.map((p) => p[1]);
  return { x0: Math.min(...xs) - 2, x1: Math.max(...xs) + 2, y0: Math.min(...ys) - 2, y1: Math.max(...ys) + b.height + 2 };
});
const inZone = ([x, y]) => zones.some((z) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1);
for (const p of basePaths) {
  if (removed.has(p)) continue;
  const { subpaths, curved, bbox } = baseInfo.get(p);
  if (curved || !bbox || bbox[2] * bbox[3] > 300000) continue;
  const pts = subpaths.flat();
  if (pts.length && pts.every(inZone)) removed.add(p);
}
const removedSideFills = {};
for (const p of removed) {
  const fill = p.attrs.fill ?? "none";
  if (fill !== "none") removedSideFills[fill] = (removedSideFills[fill] ?? 0) + 1;
}
function prune(node) {
  node.children = node.children.filter((c) => !removed.has(c));
  for (const c of node.children) prune(c);
}
prune(baseLayer);

// 4. split slab vs props
const isNamed = (id) => !!id && /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(id) && !id.startsWith("clippath");
const props = [];
const wrap = (children) =>
  `<svg width="${viewBox[2]}" height="${viewBox[3]}" viewBox="${viewBox.join(" ")}" fill="none" xmlns="http://www.w3.org/2000/svg">${children.map(serialize).join("")}</svg>`;

const slabChildren = [baseLayer];
const floorFlat = { type: "g", attrs: { id: "Floor-Layer-flat" }, children: [] };
let anon = 0;
const tappable = new Set(areas.filter((a) => a.prop).map((a) => a.prop));
function collectProps(layer, { flatPathsTo }) {
  for (const child of layer.children) {
    if (child.type === "path" && flatPathsTo) {
      flatPathsTo.children.push(child);
      continue;
    }
    const id = isNamed(child.attrs.id) ? child.attrs.id : `anon-${++anon}`;
    const bbox = bboxOf([child]);
    if (!bbox) continue;
    props.push({
      id,
      layer: layer.attrs.id,
      bbox,
      anchor: [Math.round((bbox[0] + bbox[2] / 2) * 10) / 10, Math.round((bbox[1] + bbox[3]) * 10) / 10],
      tappable: tappable.has(id),
      svg: wrap([child]),
    });
  }
}
collectProps(floorLayer, { flatPathsTo: floorFlat });
collectProps(decoLayer, { flatPathsTo: null });
if (floorFlat.children.length) slabChildren.push(floorFlat);

const out = {
  generatedFrom: path.relative(root, sourcePath),
  viewBox,
  slabSvg: wrap(slabChildren),
  blocks,
  props,
};
fs.writeFileSync(outPath, JSON.stringify(out));

// 5. report
const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(0)} KB`;
console.log(`source ${kb(source)} → ${path.relative(root, outPath)} ${kb(JSON.stringify(out))}`);
console.log(`gradients flattened: ${gradientRefs} refs / ${gradients.size} defs; mask definitions dropped: ${masksDropped}`);
console.log(`top-face candidates in Base-Layer: ${topFaces.length}`);
for (const f of topFaces) {
  const c = [f.bbox[0] + f.bbox[2] / 2, f.bbox[1] + f.bbox[3] / 2].map((v) => Math.round(v));
  const used = blocks.find((b) => b.sourceId === f.node.attrs.id);
  console.log(`  ${used ? "✓" : " "} ${f.node.attrs.id.padEnd(11)} ${f.kind.padEnd(10)} fill ${f.node.attrs.fill.padEnd(8)} centre ${c.join(",").padEnd(9)} bbox ${f.bbox.map(Math.round).join(",")}${used ? ` → ${used.id} h=${used.height}` : ""}`);
}
console.log(`blocks resolved: ${blocks.length}; slab paths removed under blocks: ${removed.size} (fills ${JSON.stringify(removedSideFills)})`);
console.log(`props: ${props.length} (${props.filter((p) => p.tappable).length} tappable, ${props.filter((p) => p.id.startsWith("anon")).length} anonymous); flat floor paths kept in slab: ${floorFlat.children.length}`);
console.log(`named props: ${props.filter((p) => !p.id.startsWith("anon")).map((p) => p.id).join(", ")}`);
if (unresolved.length) {
  console.log("UNRESOLVED:");
  for (const u of unresolved) console.log("  - " + u);
}
