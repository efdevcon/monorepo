/**
 * Ring geometry on the plan: areas, orientation, containment, simplification,
 * the pole of inaccessibility (where a sprite stands) and stroke expansion
 * for the wall lines. Plain arrays of [x, y]; no three here.
 */
import type { Point } from "./path";

export type Ring = Point[];
export type Polygon = { outer: Ring; holes: Ring[] };

/** Signed shoelace area: positive = counter-clockwise in y-up maths (clockwise on screen, where y points down). */
export function signedArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return a / 2;
}
export const area = (ring: Ring) => Math.abs(signedArea(ring));

export function bbox(rings: Ring[]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings)
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  return [minX, minY, maxX, maxY];
}

export function pointInRing(p: Point, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Ramer–Douglas–Peucker on a closed or open ring; keeps at least a triangle. */
export function simplify(ring: Ring, tolerance: number): Ring {
  if (ring.length <= 3 || tolerance <= 0) return ring;
  const keep = new Array<boolean>(ring.length).fill(false);
  keep[0] = keep[ring.length - 1] = true;
  const stack: [number, number][] = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let best = -1;
    let bestD = tolerance;
    for (let i = a + 1; i < b; i++) {
      const d = distToSegment(ring[i], ring[a], ring[b]);
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      keep[best] = true;
      stack.push([a, best], [best, b]);
    }
  }
  const out = ring.filter((_, i) => keep[i]);
  // Closed rings: the first/last pair is one edge too; drop a last point that lies on it.
  if (out.length > 3 && distToSegment(out[out.length - 1], out[out.length - 2], out[0]) <= tolerance) out.pop();
  return out.length >= 3 ? out : ring;
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Drops consecutive duplicate points and degenerate rings. */
export function cleanRing(ring: Ring, epsilon = 1e-6): Ring {
  const out: Ring = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > epsilon) out.push(p);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && Math.hypot(last[0] - first[0], last[1] - first[1]) <= epsilon) out.pop();
  return out;
}

/**
 * Groups the closed rings of one path into polygons by containment depth
 * (even-odd, which is also what Figma's booleans produce): depth 0 rings are
 * outers, depth 1 their holes, depth 2 outers again, and so on. Outers are
 * oriented counter-clockwise (y-up), holes clockwise.
 */
export function ringsToPolygons(rings: Ring[]): Polygon[] {
  const cleaned = rings.map((r) => cleanRing(r)).filter((r) => r.length >= 3 && area(r) > 1e-9);
  const depth = cleaned.map((ring, i) => cleaned.filter((other, j) => j !== i && area(other) > area(ring) && pointInRing(ring[0], other)).length);
  const polygons: Polygon[] = [];
  const parentOf = new Map<number, number>();
  cleaned.forEach((ring, i) => {
    if (depth[i] % 2 === 0) {
      parentOf.set(i, polygons.length);
      polygons.push({ outer: orient(ring, true), holes: [] });
    }
  });
  cleaned.forEach((ring, i) => {
    if (depth[i] % 2 === 1) {
      // Its parent: the smallest even-depth ring containing it.
      let parent = -1;
      let parentArea = Infinity;
      cleaned.forEach((other, j) => {
        if (depth[j] % 2 === 0 && area(other) > area(ring) && area(other) < parentArea && pointInRing(ring[0], other)) {
          parent = j;
          parentArea = area(other);
        }
      });
      if (parent >= 0) polygons[parentOf.get(parent)!].holes.push(orient(ring, false));
    }
  });
  return polygons;
}

export function orient(ring: Ring, ccw: boolean): Ring {
  return signedArea(ring) > 0 === ccw ? ring : [...ring].reverse();
}

/**
 * Pole of inaccessibility (Mapbox's polylabel): the point inside the polygon
 * farthest from its edges, so a sprite stands on the widest part of an L
 * rather than on the centroid, which can fall outside.
 */
export function polylabel(polygon: Polygon, precision = 0.5): Point {
  const rings = [polygon.outer, ...polygon.holes];
  const [minX, minY, maxX, maxY] = bbox([polygon.outer]);
  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.min(width, height);
  if (cellSize === 0) return [minX, minY];
  let h = cellSize / 2;
  const signedDist = (x: number, y: number) => {
    let inside = false;
    let minD = Infinity;
    for (const ring of rings)
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i];
        const b = ring[j];
        if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
        minD = Math.min(minD, distToSegment([x, y], a, b));
      }
    return (inside ? 1 : -1) * minD;
  };
  type Cell = { x: number; y: number; h: number; d: number; max: number };
  const cell = (x: number, y: number, h: number): Cell => {
    const d = signedDist(x, y);
    return { x, y, h, d, max: d + h * Math.SQRT2 };
  };
  const queue: Cell[] = [];
  for (let x = minX; x < maxX; x += cellSize) for (let y = minY; y < maxY; y += cellSize) queue.push(cell(x + h, y + h, h));
  // Centroid seed.
  let cx = 0;
  let cy = 0;
  let aSum = 0;
  const o = polygon.outer;
  for (let i = 0, j = o.length - 1; i < o.length; j = i++) {
    const f = o[i][0] * o[j][1] - o[j][0] * o[i][1];
    cx += (o[i][0] + o[j][0]) * f;
    cy += (o[i][1] + o[j][1]) * f;
    aSum += f * 3;
  }
  let best = aSum === 0 ? cell(minX + width / 2, minY + height / 2, 0) : cell(cx / aSum, cy / aSum, 0);
  const bboxCell = cell(minX + width / 2, minY + height / 2, 0);
  if (bboxCell.d > best.d) best = bboxCell;
  while (queue.length) {
    queue.sort((a, b) => a.max - b.max);
    const c = queue.pop()!;
    if (c.d > best.d) best = c;
    if (c.max - best.d <= precision) continue;
    h = c.h / 2;
    queue.push(cell(c.x - h, c.y - h, h), cell(c.x + h, c.y - h, h), cell(c.x - h, c.y + h, h), cell(c.x + h, c.y + h, h));
  }
  return [best.x, best.y];
}

/**
 * Expands a stroked polyline into a polygon of the stroke's width with
 * mitred joins (clamped to the bevel at sharp angles). Open runs become one
 * ring; a closed run becomes an outer ring with the inner ring as its hole.
 */
export function strokeToPolygons(points: Ring, closed: boolean, width: number): Polygon[] {
  const pts = cleanRing(points);
  if (pts.length < 2) return [];
  const half = width / 2;
  const n = pts.length;
  const miterLimit = 4;
  const offsetSide = (sign: number): Ring => {
    const out: Ring = [];
    const count = closed ? n : n;
    for (let i = 0; i < count; i++) {
      const prev = pts[(i - 1 + n) % n];
      const cur = pts[i];
      const next = pts[(i + 1) % n];
      const hasPrev = closed || i > 0;
      const hasNext = closed || i < n - 1;
      const dirIn = hasPrev ? unit([cur[0] - prev[0], cur[1] - prev[1]]) : unit([next[0] - cur[0], next[1] - cur[1]]);
      const dirOut = hasNext ? unit([next[0] - cur[0], next[1] - cur[1]]) : dirIn;
      const nIn: Point = [-dirIn[1] * sign, dirIn[0] * sign];
      const nOut: Point = [-dirOut[1] * sign, dirOut[0] * sign];
      // Miter vector = normalised sum of the two normals, scaled by 1/cos(θ/2).
      const mx = nIn[0] + nOut[0];
      const my = nIn[1] + nOut[1];
      const ml = Math.hypot(mx, my);
      if (ml < 1e-9) {
        out.push([cur[0] + nIn[0] * half, cur[1] + nIn[1] * half]);
        continue;
      }
      const cosHalf = ml / 2;
      const miterLen = Math.min(half / cosHalf, half * miterLimit);
      out.push([cur[0] + (mx / ml) * miterLen, cur[1] + (my / ml) * miterLen]);
    }
    return out;
  };
  const left = offsetSide(1);
  const right = offsetSide(-1);
  if (closed) {
    const a = area(left);
    const b = area(right);
    const [outer, inner] = a >= b ? [left, right] : [right, left];
    return [{ outer: orient(outer, true), holes: [orient(inner, false)] }];
  }
  return [{ outer: orient([...left, ...right.reverse()], true), holes: [] }];
}

function unit(v: Point): Point {
  const l = Math.hypot(v[0], v[1]);
  return l === 0 ? [0, 0] : [v[0] / l, v[1] / l];
}

/**
 * Cuts the parts of an open or closed polyline that fall inside any of the
 * axis-aligned boxes (door openings painted over the walls in the plan),
 * returning the runs that remain. A closed loop that gets cut turns into
 * open runs.
 */
export function cutPolyline(points: Ring, closed: boolean, boxes: [number, number, number, number][], margin = 0): { points: Ring; closed: boolean }[] {
  const pts = cleanRing(points);
  if (pts.length < 2) return [];
  const edges: [Point, Point][] = [];
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) edges.push([pts[i], pts[(i + 1) % pts.length]]);
  // Each edge → the sub-segments outside every box.
  const pieces: [Point, Point][][] = edges.map(([a, b]) => {
    let parts: [Point, Point][] = [[a, b]];
    for (const [bx0, by0, bx1, by1] of boxes) {
      const box: [number, number, number, number] = [bx0 - margin, by0 - margin, bx1 + margin, by1 + margin];
      parts = parts.flatMap((seg) => clipOutside(seg, box));
    }
    return parts;
  });
  const anyCut = pieces.some((p, i) => p.length !== 1 || p[0][0] !== edges[i][0] || p[0][1] !== edges[i][1]);
  if (!anyCut) return [{ points: pts, closed }];
  // Stitch consecutive pieces into runs.
  const runs: { points: Ring; closed: boolean }[] = [];
  let run: Ring = [];
  const flush = () => {
    if (run.length >= 2) runs.push({ points: run, closed: false });
    run = [];
  };
  for (const edgePieces of pieces) {
    if (edgePieces.length === 0) {
      flush();
      continue;
    }
    for (const [a, b] of edgePieces) {
      const last = run[run.length - 1];
      if (!last || Math.hypot(last[0] - a[0], last[1] - a[1]) > 1e-6) {
        flush();
        run.push(a);
      }
      run.push(b);
    }
  }
  flush();
  // A closed loop cut somewhere: its last run continues into its first.
  if (closed && runs.length > 1) {
    const first = runs[0].points;
    const last = runs[runs.length - 1].points;
    const end = last[last.length - 1];
    if (Math.hypot(end[0] - first[0][0], end[1] - first[0][1]) <= 1e-6) {
      runs[0] = { points: [...last, ...first.slice(1)], closed: false };
      runs.pop();
    }
  }
  return runs;
}

/** The parts of segment a→b outside the box (0, 1 or 2 pieces). */
function clipOutside([a, b]: [Point, Point], box: [number, number, number, number]): [Point, Point][] {
  const [x0, y0, x1, y1] = box;
  // Liang–Barsky for the inside interval.
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const checks: [number, number][] = [
    [-dx, a[0] - x0],
    [dx, x1 - a[0]],
    [-dy, a[1] - y0],
    [dy, y1 - a[1]],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return [[a, b]];
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
  }
  if (t0 >= t1) return [[a, b]];
  const at = (t: number): Point => [a[0] + t * dx, a[1] + t * dy];
  const out: [Point, Point][] = [];
  if (t0 > 1e-9) out.push([a, at(t0)]);
  if (t1 < 1 - 1e-9) out.push([at(t1), b]);
  return out;
}

/**
 * Stretches rings whose bounding box is narrower than `minWidth` along their
 * short axis, about the box centre, until they are that wide. For the stands
 * the plan draws as thin strips; the long axis is untouched.
 */
export function widen(rings: Ring[], minWidth: number): Ring[] {
  const [minX, minY, maxX, maxY] = bbox(rings);
  const w = maxX - minX;
  const h = maxY - minY;
  const short = Math.min(w, h);
  if (short <= 0 || short >= minWidth) return rings;
  const f = minWidth / short;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const sx = w <= h ? f : 1;
  const sy = w <= h ? 1 : f;
  return rings.map((ring) => ring.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy] as Point));
}
