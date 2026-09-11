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
  layer: string;
  bbox: [number, number, number, number];
  /** Bottom-centre of the bbox in SVG px: where the upright decal touches the floor. */
  anchor: [number, number];
  tappable: boolean;
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
  id: string;
  kind: "slab" | "wall" | "block" | "mat";
  name: string;
  description: string;
  tappable: boolean;
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

/** Output of scripts/plan-map-build.mjs: geometry extruded from a top-down plan SVG. */
export type PlanScene = {
  source: "plan";
  generatedFrom: string;
  viewBox: number[];
  planScale: number;
  bounds: GroundBounds;
  /** Screen extent of the floor at the start view, in px, for the camera fit. */
  fit: { width: number; height: number };
  shapes: PlanShape[];
};

/** Axis-aligned floor rectangle in ground px. */
export type GroundBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

export type MapSource = "iso" | "plan";
/** Camera pitch: the isometric orbit, or straight down. */
export type MapView = "3d" | "top";

/** Live camera orientation, written by CameraRig every frame and read by the props. */
export type CameraPose = { azimuth: number; polar: number };

export type MapSettings = {
  /** "iso": artwork un-projected + boxes; "plan": everything extruded from the top-down plan. */
  source: MapSource;
  view: MapView;
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
  source: "iso",
  view: "3d",
  projection: "ortho",
  lit: false,
  showProps: true,
  showBlocks: true,
  rotateLeftDeg: 100,
  rotateRightDeg: 60,
  zoomStep: 1.8,
};
