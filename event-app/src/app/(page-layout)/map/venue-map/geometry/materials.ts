import { Color, LineBasicMaterial, MeshStandardMaterial } from "three";

/**
 * Colours and materials of the extruded plan. Every helper normalises
 * through `toHex6` first, so a named fill never reaches the channel maths.
 */
export const OUTLINE = "#333a7f";
export const HIGHLIGHT = "#7235ed"; // dc-purple
export const SLAB_FILL = "#e4e0f8";
/** Hovered-floor slab tint: pulled this far towards dc-purple. */
export const FLOOR_TINT = 0.14;
/** Non-selected footprints while one is selected: pulled this far towards the slab colour. */
export const DIM_TOWARDS_SLAB = 0.6;
/** Side faces are a little darker than the caps. */
export const SIDE_SHADE = 0.82;

export function toHex6(c: string): string {
  if (c === "white") return "#ffffff";
  if (c === "black") return "#000000";
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  return c.toLowerCase();
}

export function scaleHex(hex: string, factor: number): string {
  const full = toHex6(hex).replace("#", "");
  const out = [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(full.slice(i, i + 2), 16) * factor))).toString(16).padStart(2, "0"));
  return `#${out.join("")}`;
}

export function mixHex(a: string, b: string, t: number): string {
  a = toHex6(a);
  b = toHex6(b);
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

export type AreaLook = "base" | "hover" | "selected" | "dimmed";

/** Cap and side colours of a footprint in a given look. */
export function areaColours(fill: string, look: AreaLook): { cap: string; side: string } {
  const highlight = look === "selected" ? 1.15 : look === "hover" ? 1.08 : 1;
  const base = look === "dimmed" ? mixHex(fill, SLAB_FILL, DIM_TOWARDS_SLAB) : fill;
  return { cap: scaleHex(base, highlight), side: scaleHex(base, SIDE_SHADE * highlight) };
}

export function outlineColour(look: AreaLook): string {
  if (look === "hover" || look === "selected") return HIGHLIGHT;
  if (look === "dimmed") return mixHex(OUTLINE, SLAB_FILL, DIM_TOWARDS_SLAB);
  return OUTLINE;
}

const meshCache = new Map<string, MeshStandardMaterial>();
const lineCache = new Map<string, LineBasicMaterial>();

/**
 * Front faces only: a block's bottom cap is coplanar with the slab top it
 * stands on and z-fought along the edge when both sides drew. polygonOffset
 * pushes the faces back a hair so the outline lines, which lie exactly on
 * the surface edges, win the depth test.
 */
export function meshMaterial(colour: string): MeshStandardMaterial {
  const key = toHex6(colour);
  let m = meshCache.get(key);
  if (!m) {
    m = new MeshStandardMaterial({ color: new Color(key), roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    meshCache.set(key, m);
  }
  return m;
}

/** Vertex-coloured material for the merged statics (slab, walls, decoration). */
export const staticMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

export function lineMaterial(colour: string): LineBasicMaterial {
  const key = toHex6(colour);
  let m = lineCache.get(key);
  if (!m) {
    m = new LineBasicMaterial({ color: new Color(key), toneMapped: false });
    lineCache.set(key, m);
  }
  return m;
}
