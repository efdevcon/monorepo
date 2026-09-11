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
  slabSvg: string;
  blocks: SceneBlock[];
  props: SceneProp[];
};

export type MapSettings = {
  projection: "ortho" | "perspective";
  lit: boolean;
  showProps: boolean;
  showBlocks: boolean;
  /** How far the floor can be turned each way from the isometric start, in degrees. */
  azimuthLimitDeg: number;
  /** Zoom factor applied per double tap. */
  zoomStep: number;
};

export const DEFAULT_SETTINGS: MapSettings = {
  projection: "ortho",
  lit: false,
  showProps: true,
  showBlocks: true,
  azimuthLimitDeg: 60,
  zoomStep: 1.8,
};
