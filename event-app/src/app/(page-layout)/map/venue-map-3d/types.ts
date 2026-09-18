/** One entry of areas.json: a tap target on the map. */
export type Area = {
  id: string;
  name: string;
  description: string;
  /** Theme icon name; derived from the id when absent (see icons.ts). */
  icon?: string | null;
  /** Numbered copies keep their number in the name ("Meeting Room 7"); set on the generic entry. */
  numbered?: boolean;
  /** Floor the area sits on. */
  level?: LevelId;
};

export type PlanShape = {
  /** Layer id from the plan SVG; unique within a level only (walls repeat on every floor). */
  id: string;
  level: LevelId;
  kind: "slab" | "wall" | "block" | "mat";
  name: string;
  description: string;
  tappable: boolean;
  /** Draw the edge lines (false for the flat floor colour patch). */
  outline: boolean;
  /** Footprint polygons in ground px (X, Z); the largest is the outline, the rest are holes. */
  polygons: [number, number][][];
  /** Centre of the outline polygon in ground px: where the icon sprite stands. */
  centroid: [number, number];
  /** Icon sprite name under public/maps/devcon-8/icons/, or null. */
  icon: string | null;
  /** Extrusion height in ground px (the slab extrudes downwards). */
  height: number;
  fill: string;
  stroke: string | null;
};

/** Floors, bottom to top. Matches LEVELS in scripts/plan-map-build.mjs. */
export const LEVEL_ORDER = ["G", "L1", "L2"] as const;
export type LevelId = (typeof LEVEL_ORDER)[number];
export const levelIndex = (id: LevelId) => LEVEL_ORDER.indexOf(id);

/** One floor of the plan bundle: geometry extruded from its top-down SVG. */
export type PlanLevel = {
  id: LevelId;
  /** Short label ("G", "L1"): the floor slider and the labels beside the stacked floors. */
  label: string;
  /** Spoken name ("Ground floor"). */
  name: string;
  generatedFrom: string;
  viewBox: number[];
  bounds: GroundBounds;
  /** Screen extent of the floor at the isometric view, in px (legacy; the camera now fits from `bounds`). */
  fit: { width: number; height: number };
  shapes: PlanShape[];
};

/** Output of scripts/plan-map-build.mjs: every floor plus the union footprint the camera fits to. */
export type PlanScene = {
  source: "plan";
  planScale: number;
  bounds: GroundBounds;
  /** Legacy screen extent at the isometric view; the camera now fits from `bounds`. */
  fit: { width: number; height: number };
  levels: PlanLevel[];
};

/** Axis-aligned floor rectangle in ground px. */
export type GroundBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

/**
 * Camera destination for a deep-linked or found footprint: ground-px point +
 * zoom multiplier over the fitted view. `bounds` (a group of footprints, e.g.
 * every toilet on a floor) makes the rig fit that rectangle instead, never
 * closer than the single-footprint zoom.
 */
export type CameraFocus = { x: number; z: number; zoom: number; key: string; bounds?: GroundBounds };

/** Live camera orientation, written by CameraRig every frame. */
export type CameraPose = { azimuth: number; polar: number };

export type MapSettings = {
  /** Floor shown; null = every floor stacked. */
  level: LevelId | null;
  /** Vertical gap between stacked floors, in world units. */
  levelGap: number;
  projection: "ortho" | "perspective";
  /** Theme icon sprites on the footprints. */
  showIcons: boolean;
  /** How far the floor can be turned from the start view, in degrees: left = lower azimuth (venue front), right = higher (empty back). */
  rotateLeftDeg: number;
  rotateRightDeg: number;
  /** Zoom factor applied per double tap. */
  zoomStep: number;
};

/**
 * The start view sits 25° left of the pure isometric diagonal (Scott,
 * 2026-09-17). The rotation range is unchanged from the isometric days
 * (100° left / 60° right of the diagonal), so measured from the new start it
 * is 75° left / 85° right.
 */
export const DEFAULT_SETTINGS: MapSettings = {
  level: null,
  levelGap: 6,
  projection: "ortho",
  showIcons: true,
  rotateLeftDeg: 75,
  rotateRightDeg: 85,
  zoomStep: 1.8,
};
