import { MathUtils } from "three";

/**
 * Camera geometry. World units are metres (plan x → X, plan y → Z, y up).
 * The camera orbits the floor at the isometric pitch and starts a little
 * left of the (1, 1, 1) diagonal, where the venue's front reads best.
 */

/** OrbitControls azimuth (atan2(x, z) of the camera offset) of the pure isometric diagonal. */
export const ISO_AZIMUTH = Math.PI / 4;
/** How far left of the diagonal the start view sits (Scott, 2026-09-17). */
export const START_TURN_DEG = 25;
export const START_AZIMUTH = ISO_AZIMUTH - MathUtils.degToRad(START_TURN_DEG);
/** Polar angle of the isometric diagonal (≈ 54.7°, i.e. 35.3° above the floor). Never changes. */
export const POLAR_ANGLE = Math.acos(1 / Math.sqrt(3));

/** Orbit radius of the orthographic camera: well outside the ~245 m floor so nothing clips. */
export const ORTHO_RADIUS = 800;
export const NEAR = 1;
export const FAR = 4000;

/** Leaves room for the legend above and the controls below the fitted floor. */
export const FIT_MARGIN = 0.82;
/** Share of the shorter viewport side a found group's ground diagonal may fill (the card covers the bottom). */
export const GROUP_FIT_MARGIN = 0.55;
/** Zoom clamps as multiples of the fit. */
export const MIN_ZOOM_FACTOR = 0.85;
export const MAX_ZOOM_FACTOR = 6;

/** Phones: the stacked home view sits this many screen px right of centre so the floor labels clear the edge. */
export const PHONE_SHIFT_PX = 28;
/** Desktop: the home views sit this much lower, centred in the band between the legend strip and the bottom controls. */
export const DESKTOP_SHIFT_PX = 24;
/** Phones pan a little faster than the finger (testers found 1:1 slow, 2026-10-13). */
export const TOUCH_PAN_SPEED = 1.15;

/** Tween clocks. */
export const TWEEN_MS = 350;
/** Floor switch, reset and focus: one clock for the floors and the camera (400 felt too fast). */
export const LEVEL_SWITCH_MS = 800;

/** Deep-link / Find zoom over the fitted floor: phones pull the footprint in, desktop only nudges (Scott, 2026-09-12). */
export const FOCUS_ZOOM_MOBILE = 2.2;
export const FOCUS_ZOOM_DESKTOP = 1.35;
