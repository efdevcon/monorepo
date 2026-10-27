/**
 * SVG path data → flattened subpaths. Handles every command (M L H V C S Q
 * T A Z, absolute and relative); curves are flattened adaptively to a
 * flatness tolerance in plan px. Arcs go through the usual endpoint → centre
 * parameterisation and are split into cubic béziers.
 */
export type Point = [number, number];
export type Subpath = { points: Point[]; closed: boolean };

type Segment =
  | { type: "M"; to: Point }
  | { type: "L"; to: Point }
  | { type: "C"; c1: Point; c2: Point; to: Point }
  | { type: "Q"; c: Point; to: Point }
  | { type: "A"; rx: number; ry: number; rotation: number; large: boolean; sweep: boolean; to: Point }
  | { type: "Z" };

function tokenize(d: string): (string | number)[] {
  const tokens: (string | number)[] = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(d))) {
    if (d.slice(last, m.index).trim().replace(/,/g, "") !== "") throw new Error(`Bad path data near "${d.slice(last, m.index + 10)}"`);
    last = m.index + m[0].length;
    tokens.push(m[1] ? m[1] : Number(m[2]));
  }
  if (d.slice(last).trim().replace(/,/g, "") !== "") throw new Error(`Bad path data tail "${d.slice(last, last + 10)}"`);
  return tokens;
}

/** Absolute segments of a path, with H/V/S/T resolved. */
export function parsePath(d: string): Segment[] {
  const tokens = tokenize(d);
  const out: Segment[] = [];
  let i = 0;
  let cmd = "";
  let cur: Point = [0, 0];
  let start: Point = [0, 0];
  let lastC: Point | null = null; // last cubic control, for S
  let lastQ: Point | null = null; // last quadratic control, for T
  const num = () => {
    const t = tokens[i++];
    if (typeof t !== "number") throw new Error(`Expected a number in path at token ${i - 1} (${cmd})`);
    return t;
  };
  const argc: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  while (i < tokens.length) {
    const t = tokens[i];
    if (typeof t === "string") {
      cmd = t;
      i++;
    } else if (cmd === "") throw new Error("Path data must start with a command");
    else if (cmd === "Z" || cmd === "z") throw new Error("Numbers after Z");
    // An implicit repeat of M is L.
    else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
    const rel = cmd === cmd.toLowerCase() && cmd !== "Z" && cmd !== "z";
    const C = cmd.toUpperCase();
    if (!(C in argc)) throw new Error(`Unknown path command ${cmd}`);
    const p = (x: number, y: number): Point => (rel ? [cur[0] + x, cur[1] + y] : [x, y]);
    switch (C) {
      case "M": {
        cur = p(num(), num());
        start = cur;
        out.push({ type: "M", to: cur });
        lastC = lastQ = null;
        break;
      }
      case "L": {
        cur = p(num(), num());
        out.push({ type: "L", to: cur });
        lastC = lastQ = null;
        break;
      }
      case "H": {
        const x = num();
        cur = [rel ? cur[0] + x : x, cur[1]];
        out.push({ type: "L", to: cur });
        lastC = lastQ = null;
        break;
      }
      case "V": {
        const y = num();
        cur = [cur[0], rel ? cur[1] + y : y];
        out.push({ type: "L", to: cur });
        lastC = lastQ = null;
        break;
      }
      case "C": {
        const c1 = p(num(), num());
        const c2 = p(num(), num());
        cur = p(num(), num());
        out.push({ type: "C", c1, c2, to: cur });
        lastC = c2;
        lastQ = null;
        break;
      }
      case "S": {
        const c1: Point = lastC ? [2 * cur[0] - lastC[0], 2 * cur[1] - lastC[1]] : cur;
        const c2 = p(num(), num());
        cur = p(num(), num());
        out.push({ type: "C", c1, c2, to: cur });
        lastC = c2;
        lastQ = null;
        break;
      }
      case "Q": {
        const c = p(num(), num());
        cur = p(num(), num());
        out.push({ type: "Q", c, to: cur });
        lastQ = c;
        lastC = null;
        break;
      }
      case "T": {
        const c: Point = lastQ ? [2 * cur[0] - lastQ[0], 2 * cur[1] - lastQ[1]] : cur;
        cur = p(num(), num());
        out.push({ type: "Q", c, to: cur });
        lastQ = c;
        lastC = null;
        break;
      }
      case "A": {
        const rx = num();
        const ry = num();
        const rotation = num();
        const large = num() !== 0;
        const sweep = num() !== 0;
        cur = p(num(), num());
        out.push({ type: "A", rx, ry, rotation, large, sweep, to: cur });
        lastC = lastQ = null;
        break;
      }
      case "Z": {
        out.push({ type: "Z" });
        cur = start;
        lastC = lastQ = null;
        break;
      }
    }
  }
  return out;
}

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Flat enough when every control point is within `flatness` of the chord. */
function flattenCubic(p0: Point, p1: Point, p2: Point, p3: Point, flatness: number, out: Point[], depth = 0) {
  const d = Math.max(distToSegment(p1, p0, p3), distToSegment(p2, p0, p3));
  if (d <= flatness || depth > 16) {
    out.push(p3);
    return;
  }
  const m = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const p01 = m(p0, p1);
  const p12 = m(p1, p2);
  const p23 = m(p2, p3);
  const p012 = m(p01, p12);
  const p123 = m(p12, p23);
  const mid = m(p012, p123);
  flattenCubic(p0, p01, p012, mid, flatness, out, depth + 1);
  flattenCubic(mid, p123, p23, p3, flatness, out, depth + 1);
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return dist(p, [a[0] + t * dx, a[1] + t * dy]);
}

/** Arc → cubic béziers (SVG implementation notes, F.6.5). */
function arcToCubics(from: Point, seg: Extract<Segment, { type: "A" }>): [Point, Point, Point][] {
  let { rx, ry } = seg;
  const { to, large, sweep } = seg;
  if (from[0] === to[0] && from[1] === to[1]) return [];
  if (rx === 0 || ry === 0) return [[from, to, to]];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (seg.rotation * Math.PI) / 180;
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);
  const dx2 = (from[0] - to[0]) / 2;
  const dy2 = (from[1] - to[1]) / 2;
  const x1 = cosP * dx2 + sinP * dy2;
  const y1 = -sinP * dx2 + cosP * dy2;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const sign = large === sweep ? -1 : 1;
  const num = Math.max(0, rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1);
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const coef = sign * Math.sqrt(den === 0 ? 0 : num / den);
  const cx1 = (coef * rx * y1) / ry;
  const cy1 = (-coef * ry * x1) / rx;
  const cx = cosP * cx1 - sinP * cy1 + (from[0] + to[0]) / 2;
  const cy = sinP * cx1 + cosP * cy1 + (from[1] + to[1]) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const d = ux * vx + uy * vy;
    const l = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.max(-1, Math.min(1, d / l)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const theta1 = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const n = Math.ceil(Math.abs(delta) / (Math.PI / 2));
  const step = delta / n;
  const out: [Point, Point, Point][] = [];
  const pointAt = (t: number): Point => [cx + rx * Math.cos(t) * cosP - ry * Math.sin(t) * sinP, cy + rx * Math.cos(t) * sinP + ry * Math.sin(t) * cosP];
  const derivAt = (t: number): Point => [-rx * Math.sin(t) * cosP - ry * Math.cos(t) * sinP, -rx * Math.sin(t) * sinP + ry * Math.cos(t) * cosP];
  const k = (4 / 3) * Math.tan(step / 4);
  for (let i = 0; i < n; i++) {
    const t0 = theta1 + i * step;
    const t1 = t0 + step;
    const p0 = pointAt(t0);
    const p3 = i === n - 1 ? to : pointAt(t1);
    const d0 = derivAt(t0);
    const d1 = derivAt(t1);
    out.push([[p0[0] + k * d0[0], p0[1] + k * d0[1]], [p3[0] - k * d1[0], p3[1] - k * d1[1]], p3]);
  }
  return out;
}

/** Flattens path data into polylines; `closed` marks subpaths ended by Z. */
export function flattenPath(d: string, flatness: number): Subpath[] {
  const subpaths: Subpath[] = [];
  let current: Subpath | null = null;
  let cur: Point = [0, 0];
  for (const seg of parsePath(d)) {
    if (seg.type === "M") {
      current = { points: [seg.to], closed: false };
      subpaths.push(current);
      cur = seg.to;
      continue;
    }
    if (!current) throw new Error("Path segment before the first M");
    switch (seg.type) {
      case "L":
        current.points.push(seg.to);
        cur = seg.to;
        break;
      case "C":
        flattenCubic(cur, seg.c1, seg.c2, seg.to, flatness, current.points);
        cur = seg.to;
        break;
      case "Q": {
        const c1: Point = [cur[0] + (2 / 3) * (seg.c[0] - cur[0]), cur[1] + (2 / 3) * (seg.c[1] - cur[1])];
        const c2: Point = [seg.to[0] + (2 / 3) * (seg.c[0] - seg.to[0]), seg.to[1] + (2 / 3) * (seg.c[1] - seg.to[1])];
        flattenCubic(cur, c1, c2, seg.to, flatness, current.points);
        cur = seg.to;
        break;
      }
      case "A":
        for (const [c1, c2, to] of arcToCubics(cur, seg)) {
          flattenCubic(cur, c1, c2, to, flatness, current.points);
          cur = to;
        }
        cur = seg.to;
        break;
      case "Z": {
        current.closed = true;
        const first: Point = current.points[0];
        const last: Point = current.points[current.points.length - 1];
        if (current.points.length > 1 && dist(first, last) < 1e-9) current.points.pop();
        cur = first;
        // A new subpath without M starts at the closed one's start point.
        current = { points: [first], closed: false };
        subpaths.push(current);
        break;
      }
    }
  }
  // Drop the stubs: a trailing M-less restart after Z, or a lone moveto.
  return subpaths.filter((s) => s.points.length >= 2);
}
