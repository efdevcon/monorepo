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
 * Strong ease-out (≈ cubic-bezier(0.22, 1, 0.36, 1)) for floors arriving on
 * screen: a whole floor is a big, heavy element, so it arrives fast and
 * settles gently.
 */
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

/**
 * Ease-in-out (≈ cubic-bezier(0.645, 0.045, 0.355, 1)) for floors leaving the
 * screen. An ease-out exit is over in a few frames with the settle happening
 * off-screen, which read as instant; this keeps the departure visible and lets
 * the floor accelerate away.
 */
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
