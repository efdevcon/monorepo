/**
 * Tap and double-tap recognition over raw pointer events, as a pure state
 * machine (testable without a DOM). A tap is a press that travels ≤ TAP_MOVE_PX
 * and lasts ≤ TAP_HOLD_MS with one pointer down; a second tap within
 * DOUBLE_TAP_MS and DOUBLE_TAP_PX of the first is a double tap. A second
 * finger (pinch) is never a tap, and a new primary pointer forgets every
 * earlier one (lost pointerups).
 */
export const TAP_MOVE_PX = 10;
export const TAP_HOLD_MS = 400;
export const DOUBLE_TAP_MS = 320;
export const DOUBLE_TAP_PX = 40;

type Press = { x: number; y: number; t: number };
export type PointerLike = { pointerId: number; isPrimary: boolean; clientX: number; clientY: number; timeStamp: number };
export type TapResult = { kind: "tap" | "double"; x: number; y: number } | null;

export class TapRecognizer {
  private pointers = new Set<number>();
  private down: Press | null = null;
  private lastTap: Press | null = null;

  pointerDown(e: PointerLike) {
    if (e.isPrimary) this.pointers.clear();
    this.pointers.add(e.pointerId);
    this.down = this.pointers.size === 1 ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
  }

  /** The gesture the release completes, if any. */
  pointerUp(e: PointerLike): TapResult {
    this.pointers.delete(e.pointerId);
    if (e.isPrimary) this.pointers.clear();
    const down = this.down;
    if (!down || this.pointers.size > 0) return null;
    this.down = null;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const held = e.timeStamp - down.t;
    if (moved > TAP_MOVE_PX || held > TAP_HOLD_MS) {
      this.lastTap = null;
      return null;
    }
    const last = this.lastTap;
    if (last && e.timeStamp - last.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - last.x, e.clientY - last.y) < DOUBLE_TAP_PX) {
      this.lastTap = null;
      return { kind: "double", x: e.clientX, y: e.clientY };
    }
    this.lastTap = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    return { kind: "tap", x: e.clientX, y: e.clientY };
  }

  pointerCancel() {
    this.pointers.clear();
    this.down = null;
  }

  /** True while a single pointer is held (hover freezes once it has travelled past the slop). */
  get pressed() {
    return this.down !== null;
  }
}
