import type { GroundBounds } from "../data/planSchema";

/**
 * Screen extent, in world units at zoom 1, of the box over `bounds` between
 * world heights `yMin` and `yMax`, seen from an orbit at `azimuth` / `polar`:
 * the eight corners projected onto the camera's right and up vectors, so the
 * fit is exact at any rotation.
 */
export function projectedExtent(bounds: GroundBounds, yMin: number, yMax: number, azimuth: number, polar: number): { width: number; height: number } {
  const sinA = Math.sin(azimuth);
  const cosA = Math.cos(azimuth);
  const sinP = Math.sin(polar);
  const cosP = Math.cos(polar);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const x of [bounds.minX, bounds.maxX])
    for (const z of [bounds.minZ, bounds.maxZ])
      for (const y of [yMin, yMax]) {
        // Camera right = (cos a, 0, −sin a); camera up = (−sin a·cos p, sin p, −cos a·cos p).
        const u = x * cosA - z * sinA;
        const v = -(x * sinA + z * cosA) * cosP + y * sinP;
        if (u < minU) minU = u;
        if (u > maxU) maxU = u;
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
  return { width: maxU - minU, height: maxV - minV };
}

/** Orthographic zoom (screen px per world unit) at which the extent fits the viewport with the margin. */
export const fitZoom = (extent: { width: number; height: number }, viewport: { width: number; height: number }, margin: number) =>
  Math.min(viewport.width / extent.width, viewport.height / extent.height) * margin;

export const boundsUnion = (a: GroundBounds, b: GroundBounds): GroundBounds => ({ minX: Math.min(a.minX, b.minX), minZ: Math.min(a.minZ, b.minZ), maxX: Math.max(a.maxX, b.maxX), maxZ: Math.max(a.maxZ, b.maxZ) });
export const boundsOfBoxes = (boxes: readonly [number, number, number, number][]): GroundBounds =>
  boxes.reduce<GroundBounds>((acc, [minX, minZ, maxX, maxZ]) => boundsUnion(acc, { minX, minZ, maxX, maxZ }), { minX: Infinity, minZ: Infinity, maxX: -Infinity, maxZ: -Infinity });
export const boundsCentre = (b: GroundBounds): [number, number] => [(b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2];
