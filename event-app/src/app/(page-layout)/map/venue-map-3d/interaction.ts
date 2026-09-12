/** Pointer travel (px) above which a press counts as a drag rather than a tap. R3F passes it as `event.delta`. */
export const TAP_SLOP_PX = 8;

/**
 * Raycast no-op for decoration-only objects. Outlines in particular must use
 * it: three's default Line threshold is 1 world unit (~45 px at the fit zoom),
 * which gave every edge an invisible halo that stole hovers and taps.
 */
export const noRaycast = () => null;

/** Floor switch: one clock and one curve for the leaving and the entering floor, and for the camera refit. */
export const LEVEL_SWITCH_MS = 400;
/** Flat view can't show vertical travel, so floors crossfade instead. */
export const LEVEL_FADE_MS = 250;
export const LEVEL_FADE_REDUCED_MS = 150;

/**
 * Strong ease-out (≈ cubic-bezier(0.22, 1, 0.36, 1)): a whole floor is a big,
 * heavy element, so it leaves fast and settles gently.
 */
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
