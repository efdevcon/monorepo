import { MathUtils } from "three";
import type { GroundBounds } from "./types";

/**
 * Camera geometry for the venue map. The floors are drawn in "ground px" (the
 * plan SVG scaled by scripts/plan-map-build.mjs) and placed in the world at
 * PX world units per ground px; the camera orbits the floor at a fixed
 * isometric pitch and a start azimuth a little left of the (1, 1, 1) diagonal.
 */

/** World units per ground px. */
export const PX = 0.01;
const SQRT3 = Math.sqrt(3);

/** OrbitControls azimuth (atan2(x, z) of the camera offset) of the pure isometric (1, 1, 1) diagonal. */
export const ISO_AZIMUTH = Math.PI / 4;
/** How far left of the diagonal the start view sits (lower azimuth shows more of the venue front). Scott, 2026-09-17. */
export const START_TURN_DEG = 25;
/** Azimuth of the start view. */
export const START_AZIMUTH = ISO_AZIMUTH - MathUtils.degToRad(START_TURN_DEG);
/** OrbitControls polar angle of the isometric diagonal (≈ 54.7°, i.e. 35.3° above the floor). Never changes. */
export const POLAR_ANGLE = Math.acos(1 / SQRT3);

/**
 * Screen extent, in world units at camera zoom 1, of the box over `bounds`
 * (ground px) between world heights `yMin` and `yMax`, seen from an orbit at
 * `azimuth` / `polar`. Projects the eight corners onto the camera's right and
 * up vectors, so the fit is exact at any rotation (the old build-time `fit`
 * was only right on the isometric diagonal).
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
  for (const x of [bounds.minX * PX, bounds.maxX * PX])
    for (const z of [bounds.minZ * PX, bounds.maxZ * PX])
      for (const y of [yMin, yMax]) {
        // Camera right = (cos a, 0, −sin a); camera up = (−sin a·cos p, sin p, −cos a·cos p).
        const u = x * cosA - z * sinA;
        const v = -(x * sinA + z * cosA) * cosP + y * sinP;
        minU = Math.min(minU, u);
        maxU = Math.max(maxU, u);
        minV = Math.min(minV, v);
        maxV = Math.max(maxV, v);
      }
  return { width: maxU - minU, height: maxV - minV };
}

/** Multiply an sRGB hex colour's channels (0..1 darkens, >1 brightens). */
export function scaleHex(hex: string, factor: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const out = [0, 2, 4].map((i) => {
    const v = Math.round(parseInt(full.slice(i, i + 2), 16) * factor);
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
  });
  return `#${out.join("")}`;
}

/** Shoelace area of a closed ring (any point type with x/y). */
export function polygonArea(poly: readonly { x: number; y: number }[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  return Math.abs(a / 2);
}
