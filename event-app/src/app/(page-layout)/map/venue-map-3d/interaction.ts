/** Pointer travel (px) above which a press counts as a drag rather than a tap. R3F passes it as `event.delta`. */
export const TAP_SLOP_PX = 8;

/**
 * Raycast no-op for decoration-only objects. Outlines in particular must use
 * it: three's default Line threshold is 1 world unit (~45 px at the fit zoom),
 * which gave every edge an invisible halo that stole hovers and taps.
 */
export const noRaycast = () => null;
