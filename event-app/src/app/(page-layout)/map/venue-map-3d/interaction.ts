/** Pointer travel (px) above which a press counts as a drag rather than a tap. R3F passes it as `event.delta`. */
export const TAP_SLOP_PX = 8;

/**
 * Raycast no-op for decoration-only objects. Outlines in particular must use
 * it: three's default Line threshold is 1 world unit (~45 px at the fit zoom),
 * which gave every edge an invisible halo that stole hovers and taps.
 */
export const noRaycast = () => null;

/** Floor switch: one clock for the leaving floors, the entering floor and the camera refit (Scott: 400 felt too fast). */
export const LEVEL_SWITCH_MS = 800;

/**
 * Strong ease-out (≈ cubic-bezier(0.22, 1, 0.36, 1)) for every floor move: a
 * whole floor is a big, heavy element, so it moves fast and settles gently.
 * (An ease-in-out for the leaving floors was tried on 2026-09-12; Scott wanted
 * to compare against ease-out — see commit 18ff7fa0d for that variant.)
 */
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

