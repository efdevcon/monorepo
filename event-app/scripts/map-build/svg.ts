/**
 * Walks a Figma SVG export: composes transforms, turns every drawable
 * element into flattened subpaths in root coordinates, and rejects what the
 * authoring contract forbids (masks, clip paths, images, text, <use>,
 * gradients, filters, blend modes). See docs/venue-map.md.
 */
import { flattenPath, type Point, type Subpath } from "./path";
import { apply, multiply, parseTransform, scaleOf, type Matrix } from "./transform";
import type { XmlNode } from "./xml";

export type Paint = { fill: string | null; stroke: string | null; strokeWidth: number; opacity: number; fillRule: "nonzero" | "evenodd" };

/** One drawn element with its ancestry (group ids from the root down, excluding the element's own id). */
export type Drawn = {
  id: string | null;
  tag: string;
  groups: string[];
  paint: Paint;
  subpaths: Subpath[];
};

export type Warning = { id: string | null; message: string };

const FORBIDDEN_TAGS = new Set(["mask", "clipPath", "image", "text", "use", "linearGradient", "radialGradient", "pattern", "filter", "foreignObject", "symbol"]);
const FORBIDDEN_ATTRS = ["mask", "clip-path", "filter", "mix-blend-mode"];
const DRAWABLE = new Set(["path", "rect", "circle", "ellipse", "polygon", "polyline", "line"]);

function elementPath(node: XmlNode): string | null {
  const a = node.attrs;
  const n = (k: string, d = 0) => (a[k] === undefined ? d : Number(a[k]));
  switch (node.tag) {
    case "path":
      return a.d ?? null;
    case "rect": {
      const [x, y, w, h] = [n("x"), n("y"), n("width"), n("height")];
      let rx = a.rx !== undefined ? n("rx") : a.ry !== undefined ? n("ry") : 0;
      let ry = a.ry !== undefined ? n("ry") : rx;
      rx = Math.min(rx, w / 2);
      ry = Math.min(ry, h / 2);
      if (rx <= 0 || ry <= 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
    }
    case "circle":
    case "ellipse": {
      const [cx, cy] = [n("cx"), n("cy")];
      const rx = node.tag === "circle" ? n("r") : n("rx");
      const ry = node.tag === "circle" ? n("r") : n("ry");
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
    }
    case "polygon":
    case "polyline": {
      const nums = (a.points ?? "").trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (nums.length < 4 || nums.length % 2) return null;
      const pts: Point[] = [];
      for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
      return `M${pts.map((p) => p.join(" ")).join("L")}${node.tag === "polygon" ? "Z" : ""}`;
    }
    case "line":
      return `M${n("x1")} ${n("y1")}L${n("x2")} ${n("y2")}`;
    default:
      return null;
  }
}

function paintOf(node: XmlNode, inherited: Paint, ctmScale: number): Paint {
  const a = node.attrs;
  const fill = a.fill === undefined ? inherited.fill : a.fill === "none" ? null : a.fill;
  const stroke = a.stroke === undefined ? inherited.stroke : a.stroke === "none" ? null : a.stroke;
  const strokeWidth = a["stroke-width"] === undefined ? inherited.strokeWidth : Number(a["stroke-width"]) * ctmScale;
  const opacity = inherited.opacity * (a.opacity === undefined ? 1 : Number(a.opacity)) * (a["fill-opacity"] === undefined ? 1 : Number(a["fill-opacity"]));
  const fillRule = a["fill-rule"] === "evenodd" ? "evenodd" : inherited.fillRule;
  return { fill, stroke, strokeWidth, opacity, fillRule };
}

/** Every drawable element under the root, flattened into root coordinates. */
export function walkSvg(root: XmlNode, flatness: number): { drawn: Drawn[]; warnings: Warning[]; viewBox: [number, number, number, number] } {
  if (root.tag !== "svg") throw new Error(`Root is <${root.tag}>, not <svg>`);
  const vb = (root.attrs.viewBox ?? "").trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some(Number.isNaN)) throw new Error("Missing or malformed viewBox");
  const drawn: Drawn[] = [];
  const warnings: Warning[] = [];
  const base: Paint = { fill: "black", stroke: null, strokeWidth: 1, opacity: 1, fillRule: "nonzero" };

  const visit = (node: XmlNode, ctm: Matrix, paint: Paint, groups: string[]) => {
    const id = node.attrs.id ?? null;
    if (FORBIDDEN_TAGS.has(node.tag)) throw new Error(`<${node.tag}>${id ? ` id="${id}"` : ""} is not allowed in a plan export`);
    for (const attr of FORBIDDEN_ATTRS) if (node.attrs[attr] !== undefined) throw new Error(`${attr} on <${node.tag}>${id ? ` id="${id}"` : ""} is not allowed`);
    if (node.attrs.style !== undefined) throw new Error(`style attribute on <${node.tag}>${id ? ` id="${id}"` : ""} is not allowed (export from Figma, don't edit the SVG)`);
    const local = multiply(ctm, parseTransform(node.attrs.transform));
    const p = paintOf(node, paint, scaleOf(local) / scaleOf(ctm) || 1);
    if (p.opacity < 1 && node.tag !== "svg") warnings.push({ id, message: `opacity ${p.opacity.toFixed(2)} on <${node.tag}>` });
    if (node.tag === "g" || node.tag === "svg") {
      for (const child of node.children) visit(child, local, p, node.tag === "g" ? [...groups, id ?? ""] : groups);
      return;
    }
    if (node.tag === "defs") throw new Error("<defs> is not allowed in a plan export");
    if (!DRAWABLE.has(node.tag)) {
      warnings.push({ id, message: `<${node.tag}> ignored` });
      return;
    }
    const d = elementPath(node);
    if (d === null) {
      warnings.push({ id, message: `<${node.tag}> without geometry ignored` });
      return;
    }
    const subpaths = flattenPath(d, flatness).map((s) => ({ ...s, points: s.points.map(([x, y]) => apply(local, x, y)) }));
    if ((p.fill && p.fill.startsWith("url(")) || (p.stroke && p.stroke.startsWith("url("))) throw new Error(`Gradient or pattern paint on ${id ?? node.tag} is not allowed`);
    drawn.push({ id, tag: node.tag, groups, paint: { ...p, strokeWidth: p.strokeWidth }, subpaths });
  };
  visit(root, [1, 0, 0, 1, 0, 0], base, []);
  return { drawn, warnings, viewBox: [vb[0], vb[1], vb[2], vb[3]] };
}
