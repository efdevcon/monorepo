import { Matrix4, Vector3 } from "three";

/**
 * The artwork is a true isometric drawing: a world point (x, y = up, z)
 * lands on screen at u = (x − z)·cos30°, v = (x + z)·sin30° − y, with v
 * pointing down and every axis drawn at full length. Everything here is the
 * inverse of that, so a camera sitting on the (1, 1, 1) diagonal reproduces
 * the illustration pixel for pixel on the first frame.
 */

/** World units per SVG pixel (along the drawing's own axes). */
export const PX = 0.01;
const SQRT3 = Math.sqrt(3);
/**
 * An isometric *drawing* shows every axis at full length; a real orthographic
 * camera on the (1, 1, 1) diagonal shows them at √(2/3) of that. The result is
 * a uniform scale, so the artwork stays exact but appears this much smaller
 * per world unit. Used when fitting the camera.
 */
const ISO_FORESHORTENING = Math.sqrt(2 / 3);
/** Screen pixels one SVG pixel occupies at camera zoom 1. */
export const SCREEN_PX_PER_SVG_PX = PX * ISO_FORESHORTENING;

/** Unit vector from the orbit target towards the camera at the start. */
export const VIEW_DIR = new Vector3(1, 1, 1).normalize();
/** OrbitControls azimuth (atan2(x, z) of the camera offset) of VIEW_DIR. */
export const INITIAL_AZIMUTH = Math.PI / 4;
/** OrbitControls polar angle of VIEW_DIR (≈ 54.7°, i.e. 35.3° above the floor). */
export const POLAR_ANGLE = Math.acos(1 / SQRT3);

/** Floor point (world x, z) under a screen point given in SVG px. */
export function groundFromScreen(u: number, v: number): [number, number] {
  return [(u / SQRT3 + v) * PX, (v - u / SQRT3) * PX];
}

/**
 * Maps flat artwork (local u, v in SVG px, z = 0) onto the floor plane. Local
 * z becomes world y so the matrix stays invertible for raycasting and small
 * per-layer offsets can be applied as `position-z`.
 */
export const GROUND_MATRIX = new Matrix4().set(
  PX / SQRT3, PX, 0, 0,
  0, 0, 1, 0,
  -PX / SQRT3, PX, 0, 0,
  0, 0, 0, 1
);

/** World direction of one screen pixel to the right / downwards at the start view. */
const SCREEN_RIGHT = new Vector3(1, 0, -1).multiplyScalar(PX / SQRT3);
const SCREEN_DOWN = new Vector3(1, -2, 1).multiplyScalar(PX / 3);

/**
 * Places a decal drawn in SVG px upright in the world, facing the start view,
 * with `anchor` (bottom-centre of the decal) at the local origin so the parent
 * group can sit on the floor and spin around it. Local z is along the view
 * direction in world units (used for tiny stacking offsets).
 */
export function billboardMatrix(anchorU: number, anchorV: number): Matrix4 {
  const t = new Vector3()
    .addScaledVector(SCREEN_RIGHT, -anchorU)
    .addScaledVector(SCREEN_DOWN, -anchorV);
  return new Matrix4().set(
    SCREEN_RIGHT.x, SCREEN_DOWN.x, VIEW_DIR.x, t.x,
    SCREEN_RIGHT.y, SCREEN_DOWN.y, VIEW_DIR.y, t.y,
    SCREEN_RIGHT.z, SCREEN_DOWN.z, VIEW_DIR.z, t.z,
    0, 0, 0, 1
  );
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
