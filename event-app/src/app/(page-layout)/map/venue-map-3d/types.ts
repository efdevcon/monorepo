/** One entry of areas.json: a tap target on the map. */
export type Area = {
  id: string;
  name: string;
  description: string;
  /** Seed point (SVG px) inside a Base-Layer block; resolved to a 3D box by scripts/iso-map-build.mjs. */
  seed?: [number, number];
  /** Fallback block height (SVG px) when no vertical edge is drawn next to the top face. */
  height?: number;
  /** Figma layer id of a Floor-/Decoration-Layer group that is this area's tap target. */
  prop?: string;
  /** Theme icon name; derived from the id when absent (see icons.ts). */
  icon?: string | null;
  /** Numbered copies keep their number in the name ("Meeting Room 7"); set on the generic entry. */
  numbered?: boolean;
  /** Floor the area sits on (plan source only). */
  level?: LevelId;
};

export type SceneBlock = {
  id: string;
  kind: "top" | "silhouette";
  /** Top face in SVG px, ring order. */
  top: [number, number][];
  /** Height in SVG px (vertical edges are drawn 1:1 in the isometric artwork). */
  height: number;
  fill: string;
  stroke: string | null;
  sourceId: string;
};

export type SceneProp = {
  id: string;
  bbox: [number, number, number, number];
  /** Bottom-centre of the bbox in SVG px: where the upright decal touches the floor. */
  anchor: [number, number];
  svg: string;
};

export type SceneData = {
  generatedFrom: string;
  viewBox: number[];
  /** Ground footprint of the floor slab in ground px (top-down fit). */
  bounds: GroundBounds;
  slabSvg: string;
  blocks: SceneBlock[];
  props: SceneProp[];
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
  /** Pill label ("G", "L1"). */
  label: string;
  /** Spoken name ("Ground floor"). */
  name: string;
  generatedFrom: string;
  viewBox: number[];
  bounds: GroundBounds;
  /** Screen extent of the floor at the start view, in px, for the camera fit. */
  fit: { width: number; height: number };
  shapes: PlanShape[];
};

/** Output of scripts/plan-map-build.mjs: every floor plus the union footprint the camera fits to. */
export type PlanScene = {
  source: "plan";
  planScale: number;
  bounds: GroundBounds;
  fit: { width: number; height: number };
  levels: PlanLevel[];
};

/** Axis-aligned floor rectangle in ground px. */
export type GroundBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

export type MapSource = "iso" | "plan";
/** Camera pitch: the isometric orbit, or straight down. */
export type MapView = "3d" | "top";

/**
 * Camera destination for a deep-linked or found footprint: ground-px point +
 * zoom multiplier over the fitted view. `bounds` (a group of footprints, e.g.
 * every toilet on a floor) makes the rig fit that rectangle instead, never
 * closer than the single-footprint zoom.
 */
export type CameraFocus = { x: number; z: number; zoom: number; key: string; bounds?: GroundBounds };

/** Live camera orientation, written by CameraRig every frame and read by the props. */
export type CameraPose = { azimuth: number; polar: number };

export type MapSettings = {
  /** "plan" (default): everything extruded from the top-down plans; "iso": the artwork import demo. */
  source: MapSource;
  view: MapView;
  /** Floor shown on the redraw; null = every floor stacked (3D only). */
  level: LevelId | null;
  /** Vertical gap between stacked floors, in world units. */
  levelGap: number;
  projection: "ortho" | "perspective";
  lit: boolean;
  showProps: boolean;
  showBlocks: boolean;
  /** How far the floor can be turned from the start view, in degrees: left = lower azimuth (venue front), right = higher (empty back). */
  rotateLeftDeg: number;
  rotateRightDeg: number;
  /** Zoom factor applied per double tap. */
  zoomStep: number;
};

export const DEFAULT_SETTINGS: MapSettings = {
  source: "plan",
  view: "3d",
  level: null,
  levelGap: 6,
  projection: "ortho",
  lit: false,
  showProps: true,
  showBlocks: true,
  rotateLeftDeg: 100,
  rotateRightDeg: 60,
  zoomStep: 1.8,
};
