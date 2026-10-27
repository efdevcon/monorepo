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

/** Leaves room for the legend above and the controls below the fitted floor (desktop; the vertical fit on phones). */
export const FIT_MARGIN = 0.82;
/** Phones fit the floor by width instead: this gutter on the left (and the right while one floor shows), so the floor nearly touches the edges (Scott, 2026-10-26). */
export const PHONE_FIT_GUTTER_PX = 8;
/** Phones, stacked: the right gutter holds the floor labels' column (20px labels, 12px off the corner). */
export const PHONE_LABEL_ROOM_PX = 42;
/** Phones, stacked: the stack sits this many px above centre so the lowest label clears the floor slider (iPhone 15, Scott, 2026-10-26). */
export const PHONE_STACK_LIFT_PX = 72;
/** Share of the shorter viewport side a found group's ground diagonal may fill (the card covers the bottom). */
export const GROUP_FIT_MARGIN = 0.55;
/** Zoom clamps as multiples of the fit: 14× everywhere since 2026-10-27 (Scott; was 6×, then 10× on phones, where supporter lockups and small booths were hard to read and tap). */
export const MIN_ZOOM_FACTOR = 0.85;
export const MAX_ZOOM_FACTOR = 14;
export const MAX_ZOOM_FACTOR_MOBILE = 14;
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
