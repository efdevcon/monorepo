export type Easing = (t: number) => number;
export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);
/** Strong ease-out (≈ cubic-bezier(0.22, 1, 0.36, 1)) for every floor move: a whole floor is big and heavy, so it moves fast and settles gently. */
export const easeOutQuint: Easing = (t) => 1 - Math.pow(1 - t, 5);

/** Progress 0..1 of a tween started at `start` with `duration` ms at time `now`; a zero duration is done at once. */
export const progress = (start: number, duration: number, now: number) => (duration <= 0 ? 1 : Math.min(1, (now - start) / duration));
