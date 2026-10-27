/**
 * Floor registration. Each floor is exported from its own Figma frame at its
 * own size, so the build lines the floors up on marks every floor draws (the
 * elevator shafts): a floor is scaled so its marks are as far apart as the
 * reference floor's and shifted so the marks' midpoint lands on the same
 * world point. Pure, so it can be tested without an SVG.
 */
import type { Point } from "./path";

/** How a floor's plan px map to world metres: `world = px * metresPerPx + offset`. */
export type Frame = { metresPerPx: number; offset: [number, number] };

export type RegistrationInput = {
  /** Centres of the registration footprints, plan px, any order. */
  marks: Point[];
  /** Metres per px from a `meta/scale` line, when the floor has one. */
  metaScale: number | null;
};

export type RegistrationResult = { frame: Frame; note: string; warning: string | null };

const span = (marks: Point[]): { distance: number; mid: Point } => {
  const sorted = [...marks].sort((a, b) => a[0] - b[0]);
  const left = sorted[0];
  const right = sorted[sorted.length - 1];
  return { distance: Math.hypot(right[0] - left[0], right[1] - left[1]), mid: [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2] };
};

/**
 * Frames for every floor. The reference floor is at its own scale (meta line
 * or the fallback) with no offset; the others register on it when both draw
 * two or more marks, else they keep the fallback scale and sit at the origin
 * (with a warning: the stack will not line up).
 */
export function registerFrames(inputs: Record<string, RegistrationInput>, reference: string, fallbackMetresPerPx: number): Record<string, RegistrationResult> {
  const out: Record<string, RegistrationResult> = {};
  const ref = inputs[reference];
  if (!ref) throw new Error(`reference floor ${reference} is not among the floors`);
  const refScale = ref.metaScale ?? fallbackMetresPerPx;
  const refSpan = ref.marks.length >= 2 ? span(ref.marks) : null;
  for (const id of Object.keys(inputs)) {
    const input = inputs[id];
    if (id === reference) {
      out[id] = { frame: { metresPerPx: refScale, offset: [0, 0] }, note: `reference floor, ${ref.metaScale ? "scale from the meta line" : "fallback scale"}, ${input.marks.length} registration marks`, warning: null };
      continue;
    }
    const own = input.marks.length >= 2 ? span(input.marks) : null;
    if (!own || !refSpan) {
      out[id] = {
        frame: { metresPerPx: input.metaScale ?? fallbackMetresPerPx, offset: [0, 0] },
        note: "not registered",
        warning: `not registered on ${reference}: needs two registration footprints on both floors (this floor draws ${input.marks.length}${refSpan ? "" : `, ${reference} draws ${ref.marks.length}`}); drawn at the fallback scale from the origin`,
      };
      continue;
    }
    const metresPerPx = input.metaScale ?? (refSpan.distance * refScale) / own.distance;
    const offset: [number, number] = [refSpan.mid[0] * refScale - own.mid[0] * metresPerPx, refSpan.mid[1] * refScale - own.mid[1] * metresPerPx];
    out[id] = { frame: { metresPerPx, offset }, note: `registered on ${reference} by ${input.marks.length} marks: ${input.metaScale ? "scale from the meta line" : `scale ${(metresPerPx / refScale).toFixed(3)}× the reference`}, offset (${offset[0].toFixed(1)}, ${offset[1].toFixed(1)}) m`, warning: null };
  }
  return out;
}
