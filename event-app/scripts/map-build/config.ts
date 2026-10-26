import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const MAP_DIR = path.join(ROOT, "src/app/(page-layout)/map/venue-map");
export const DATA_DIR = path.join(MAP_DIR, "data");
export const ICONS_DIR = path.join(ROOT, "public/maps/devcon-8/icons");
export const BUNDLE_PATH = path.join(DATA_DIR, "plan.generated.json");
export const ROOMS_PATH = path.join(DATA_DIR, "rooms.generated.json");
export const ICON_NAMES_PATH = path.join(DATA_DIR, "icons.generated.ts");

/**
 * Metres per plan px of the reference floor when its export carries no
 * `meta/scale-<m>` line. The Level 3 plan is 4895 px wide; at 0.05 that is
 * ~245 m, about the length of the JWCC exhibition halls.
 */
export const FALLBACK_METRES_PER_PX = 0.05;
/**
 * The floors are exported at whatever size their Figma frame has, so each
 * one is registered on the reference floor: scaled so its registration
 * footprints (the elevator shafts, which every floor draws) are as far apart
 * as the reference floor's, and shifted so their midpoint lands on the same
 * world point. A `meta/scale-<m>` line on a floor overrides the scale, the
 * shift still comes from the marks. See register.ts.
 */
export const REFERENCE_LEVEL = "L3";
export const REGISTRATION_AREA = "elevator";

/**
 * Extrusion heights in metres. A little taller than life so the blocks read
 * at the fitted zoom, but no longer towering over the 3 m walls (Scott,
 * 2026-10-25: stage 8 / room 6 / kiosk 3.5 felt unusually tall).
 */
export const HEIGHTS = {
  stage: 5.5,
  room: 3,
  kiosk: 2.5,
  zone: 0.3,
  wall: 3,
  deco: 0.15,
  /** The slab extrudes downwards by this much. */
  slab: 4,
} as const;

/** Curve flattening tolerance and ring simplification tolerance, in plan px. */
export const FLATNESS_PX = 0.25;
export const SIMPLIFY_PX = 0.2;
/** Door openings are painted over the walls in the slab colour; the walls are cut back by this margin (plan px) around each. */
export const DOOR_CUT_MARGIN_PX = 0.5;
/** An area drawn inside another one starts this far above the container's top (metres), so the two caps never share a plane. */
export const NESTED_LIFT = 0.05;
/**
 * A closed stroke-only ring in the Outline layer whose box reaches at least this far (plan px)
 * beyond the slab on every side is the plan's 2D outline ring (the production company draws one
 * around Levels 0–2, 20 px out): useful on paper, a stray wall in 3D, so it is dropped even when
 * named `wall` (Scott, 2026-10-26). Level 3's thick ring sits on the slab edge and stays.
 */
export const OUTLINE_RING_MIN_PX = 5;
/**
 * A slab hole whose vertices come within this (plan px) of the slab's outer ring is a balcony
 * void drawn to the edge (Levels 1–2 since their 2026-10-26 re-export): it becomes a notch in the
 * ring, and the exterior wall is cut over it, so the void opens onto the floor below (Scott, 2026-10-26).
 */
export const VOID_EDGE_EPS_PX = 1;
/** A named wall whose box sits within this (plan px) of the slab's box on every side is the exterior wall. */
export const EXTERIOR_WALL_TOL_PX = 6;
/**
 * The plan's stairs symbol (two filled shapes in the line colour: the steps and the arrow) spans
 * this range (metres) on each side; an unnamed Outline subgroup of exactly that is a stairs place,
 * like the named `stairs` groups on Level 2 (Scott, 2026-10-26: every floor shows the stairs icon).
 */
export const STAIRS_SYMBOL_M: [number, number] = [1.5, 3.5];
/** Stroke-only closed boxes in the Outline layer smaller than this (metres) are the plan's column markers: not drawn (Scott, 2026-10-25). */
export const COLUMN_MARKER_MAX_M = 2.5;
/**
 * The plan draws its walls as ~4.8 px strokes (9.7 px for the outer wall)
 * and its detail lines (stair treads, partitions) at ~2 px, whatever the
 * frame's scale, so on a floor that names no walls an unnamed stroke-only
 * line in the Outline layer at least this wide is a wall. A floor that
 * names its walls (`wall`, `wall_2`, …) has exactly those.
 */
export const WALL_MIN_STROKE_PX = 4;
/** An unnamed Outline subgroup holding only stroke-only lines, this many or more, is a hatch (stair treads, operable-wall ticks): flat decoration, never walls. A single stroke-only path with this many subpaths counts the same. */
export const HATCH_MIN_STROKES = 3;
