"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

/**
 * Time-sliced rendering for a long list of groups (the 27 speaker letter
 * groups, a day's schedule time groups). The first render includes `initial`
 * groups; the rest fill in one group per frame in the background, so a first
 * mount costs a screenful of cards and the list is complete a second or two
 * later. Groups past `visible` render a fixed-height placeholder.
 *
 * Why not render-on-viewport-approach: an A–Z jump then lands on placeholders
 * whose estimated heights are off, the groups around the landing point mount
 * and grow, content shifts under the finger (it reads as an unwanted scroll),
 * and rapid jumps stack heavy mounts (Scott's rail slowdown/crash on iOS).
 * Once this warm-up is over the list is fully mounted and every jump is an
 * exact teleport, the steady state the A–Z rail was designed against.
 *
 * `revealAll()` completes the list synchronously (flushSync) for jumps that
 * must measure real positions; call it from event handlers only. `minVisible`
 * forces groups up to an index into the first render (the schedule's landing
 * group), so the initial "land on now" measures a real element.
 */
export function useProgressiveReveal(
  total: number,
  initial: number,
  minVisible = 0
): { visible: number; revealAll: () => void } {
  const [revealed, setRevealed] = useState(() => Math.min(total, Math.max(initial, minVisible)));
  const visible = Math.min(total, Math.max(revealed, minVisible));

  useEffect(() => {
    if (visible >= total) return;
    // One group per animation frame, yielding to input between groups.
    let raf = 0;
    let timer = 0;
    raf = requestAnimationFrame(() => {
      timer = window.setTimeout(() => setRevealed(Math.min(total, visible + 1)), 0);
    });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [visible, total]);

  const revealAll = useCallback(() => {
    if (revealed >= total) return;
    flushSync(() => setRevealed(total));
  }, [revealed, total]);

  return { visible, revealAll };
}

/** Placeholder for a group that has not rendered yet (see useProgressiveReveal). */
export function GroupPlaceholder({ height }: { height: number }) {
  return <div style={{ minHeight: height }} aria-hidden />;
}
