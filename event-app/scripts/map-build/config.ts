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
 * Metres per plan px when the export carries no `meta/scale-<m>` line. The
 * Level 3 plan is 4895 px wide; at 0.05 that is ~245 m, about the length of
 * the JWCC exhibition halls.
 */
export const FALLBACK_METRES_PER_PX = 0.05;

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
/** Stroke-only closed boxes in the Outline layer smaller than this (metres) are the plan's column markers: not drawn (Scott, 2026-10-25). */
export const COLUMN_MARKER_MAX_M = 2.5;
