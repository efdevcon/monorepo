import { BufferGeometry, Color, ShapeGeometry } from "three";
import { SVGLoader, type StrokeStyle } from "three/examples/jsm/loaders/SVGLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type LayerPart = {
  geometry: BufferGeometry;
  color: Color;
  opacity: number;
  /** Draw order: fills in order of first appearance, then strokes. */
  order: number;
};

const STROKE_ORDER_OFFSET = 10_000;

/** The style object SVGLoader.parse() leaves on each path's userData. */
type PathStyle = Partial<StrokeStyle> & {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  opacity?: number;
};

/**
 * Turns an SVG string into a handful of merged geometries, one per colour
 * (fills) plus one per stroke colour, instead of one mesh per path. Fills
 * keep the document order of their colour's first appearance and every
 * stroke draws after every fill, which is the right answer for an outlined
 * illustration and keeps a ~5k-path drawing at a few dozen draw calls.
 */
export function buildLayerParts(svgText: string): LayerPart[] {
  const { paths } = new SVGLoader().parse(svgText);
  const groups = new Map<string, { geometries: BufferGeometry[]; color: Color; opacity: number; order: number }>();
  let index = 0;

  const add = (key: string, color: string, opacity: number, order: number, geometry: BufferGeometry) => {
    let group = groups.get(key);
    if (!group) {
      group = { geometries: [], color: new Color().setStyle(color), opacity, order };
      groups.set(key, group);
    }
    group.geometries.push(geometry);
  };

  for (const path of paths) {
    const style = (path.userData?.style ?? {}) as PathStyle;
    const groupOpacity = style.opacity ?? 1;
    const fill = style.fill;
    if (fill && fill !== "none") {
      const opacity = (style.fillOpacity ?? 1) * groupOpacity;
      if (opacity > 0) {
        for (const shape of path.toShapes()) {
          add(`f|${fill}|${opacity.toFixed(2)}`, fill, opacity, index, new ShapeGeometry(shape));
        }
      }
    }
    const stroke = style.stroke;
    if (stroke && stroke !== "none" && (style.strokeWidth ?? 0) > 0) {
      const opacity = (style.strokeOpacity ?? 1) * groupOpacity;
      if (opacity > 0) {
        for (const subPath of path.subPaths) {
          const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), style as StrokeStyle);
          if (geometry) add(`s|${stroke}|${opacity.toFixed(2)}`, stroke, opacity, STROKE_ORDER_OFFSET + index, geometry);
        }
      }
    }
    index++;
  }

  const parts: LayerPart[] = [];
  for (const group of groups.values()) {
    const merged = group.geometries.length === 1 ? group.geometries[0] : mergeGeometries(group.geometries, false);
    if (group.geometries.length > 1) for (const g of group.geometries) g.dispose();
    if (!merged) continue;
    parts.push({ geometry: merged, color: group.color, opacity: group.opacity, order: group.order });
  }
  parts.sort((a, b) => a.order - b.order);
  parts.forEach((p, i) => (p.order = i));
  return parts;
}

const cache = new Map<string, LayerPart[]>();

/** Memoised across pane mounts: parsing the slab costs a few hundred ms. */
export function getLayerParts(key: string, svgText: string): LayerPart[] {
  let parts = cache.get(key);
  if (!parts) {
    parts = buildLayerParts(svgText);
    cache.set(key, parts);
  }
  return parts;
}
