import { BufferAttribute, BufferGeometry, Color, EdgesGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { LevelId } from "../data/levels";
import type { MapShape } from "../data/planSchema";
import { levelOf } from "../data/resolve";
import { scaleHex, SIDE_SHADE, toHex6 } from "./materials";

/**
 * Geometry of one floor, built once per level (module cache): the statics
 * (slab, walls, decoration) merged into one vertex-coloured mesh plus one
 * merged edge set for the slab and walls, and one extrusion per tappable
 * area (they need their own materials for hover and selection).
 */
export type FloorGeometry = {
  statics: BufferGeometry;
  staticEdges: BufferGeometry;
  areas: Map<string, { geometry: BufferGeometry; edges: BufferGeometry; shape: MapShape }>;
};

/** Edge-line angle threshold: only the real corners, not the fan of a rounded corner. */
const EDGE_ANGLE = 15;

/** Shape space is (X, −Z); rotateX(−90°) then maps (x, y, depth) → (x, depth, −y), i.e. up = +Y, world z = Z. */
function extrude(shape: MapShape): ExtrudeGeometry {
  const shapes = shape.polygons.map((poly) => {
    const outline = new Shape(poly.outer.map(([x, z]) => new Vector2(x, -z)));
    for (const hole of poly.holes) outline.holes.push(new Path(hole.map(([x, z]) => new Vector2(x, -z))));
    return outline;
  });
  const g = new ExtrudeGeometry(shapes, { depth: shape.height, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  // The slab hangs below the floor plane; everything else stands on it, or on the area it is drawn inside (`base`).
  if (shape.kind === "slab") g.translate(0, -shape.height, 0);
  else if (shape.base) g.translate(0, shape.base, 0);
  return g;
}

/** Paints caps and sides (ExtrudeGeometry groups 0 and 1) and strips the groups so the geometry can merge. */
function colourise(g: ExtrudeGeometry, fill: string): BufferGeometry {
  const count = g.attributes.position.count;
  const colours = new Float32Array(count * 3);
  const cap = new Color(toHex6(fill));
  const side = new Color(scaleHex(fill, SIDE_SHADE));
  const sideStart = g.groups[1]?.start ?? count;
  for (let i = 0; i < count; i++) {
    const c = i < sideStart ? cap : side;
    colours[i * 3] = c.r;
    colours[i * 3 + 1] = c.g;
    colours[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new BufferAttribute(colours, 3));
  g.clearGroups();
  return g;
}

const cache = new Map<LevelId, FloorGeometry>();

export function buildFloorGeometry(level: LevelId): FloorGeometry {
  const cached = cache.get(level);
  if (cached) return cached;
  const statics: BufferGeometry[] = [];
  const edges: BufferGeometry[] = [];
  const areas: FloorGeometry["areas"] = new Map();
  for (const shape of levelOf(level).shapes) {
    const g = extrude(shape);
    if (shape.kind === "area") {
      areas.set(shape.key, { geometry: g, edges: new EdgesGeometry(g, EDGE_ANGLE), shape });
      continue;
    }
    if (shape.outline) edges.push(new EdgesGeometry(g, EDGE_ANGLE));
    statics.push(colourise(g, shape.fill));
  }
  const built: FloorGeometry = {
    statics: statics.length ? mergeGeometries(statics, false)! : new BufferGeometry(),
    staticEdges: edges.length ? mergeGeometries(edges, false)! : new BufferGeometry(),
    areas,
  };
  for (const g of statics) g.dispose();
  for (const g of edges) g.dispose();
  cache.set(level, built);
  return built;
}
