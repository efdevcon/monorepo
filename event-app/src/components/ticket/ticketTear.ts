import type { Easing } from "framer-motion";

/**
 * The ticket tear-off concepts (Scott, 2026-11-04): once a ticket is checked
 * in, its bottom half tears away along the perforation and the stub stays
 * (EventTicketCard). Each concept is one timeline in seconds for the piece's
 * transforms about its hinge; the card plays it with one framer animation and
 * closes the gap below the stub from `fallAt`. The dev switch under the
 * ticket (`?previewCheckedIn=1`) flips between them for comparison.
 */
export interface TearTrack {
  values: number[];
  /** Seconds from the start, one per value (converted to framer's 0–1 `times`). */
  at: number[];
  /** One easing per segment (values.length − 1), or one for all. */
  ease: Easing | Easing[];
}

type TearTracks = Partial<Record<"rotate" | "skewY" | "x" | "y" | "opacity", TearTrack>>;

export interface TearConcept {
  name: string;
  /** Point of the piece its transforms act about, as a transform-origin.
   *  For the hanging concepts it is the point that stays attached: the
   *  notch mask cuts a 12px quarter circle out of the piece's top-left
   *  corner, so the hinge is the notch's edge at (12px, 0), the first point
   *  of material on the perforation, under the stub's own notch edge. */
  hinge: string;
  /** Total length, seconds. */
  duration: number;
  /** When the piece lets go and the gap below the stub starts closing. */
  fallAt: number;
  gapClose: { duration: number; ease: Easing };
  tracks: TearTracks;
  /** The stub's own reaction, if the concept has one (same clock). */
  stub?: { hinge: string; tracks: TearTracks };
}

/** A 361×138 piece hung from a corner settles with its centre of mass under
 *  the hinge: atan(138/361) off the vertical, ≈ 69°. */
const REST_ANGLE = 69;

/** Concept 1 — the first cut. Rigid piece: it rotates off the hinge at
 *  once (gravity ease-in), five quick half-swings, a hold, then a straight
 *  fall with a tumble. */
const concept1: TearConcept = {
  name: "Rigid drop",
  hinge: "12px 0px",
  duration: 2.5,
  fallAt: 1.95,
  gapClose: { duration: 0.5, ease: [0.2, 0, 0, 1] },
  tracks: {
    rotate: {
      values: [0, 74, 63, 72.5, 66, 70.5, 68, REST_ANGLE, REST_ANGLE, 84],
      at: [0, 0.5, 0.72, 0.95, 1.18, 1.4, 1.62, 1.85, 1.95, 2.5],
      ease: [[0.55, 0, 1, 0.45], "easeInOut", "easeInOut", "easeInOut", "easeInOut", "easeInOut", "easeInOut", "linear", "easeIn"],
    },
    y: { values: [0, 0, 440], at: [0, 1.95, 2.5], ease: ["linear", [0.5, 0, 1, 1]] },
    opacity: { values: [1, 1, 0], at: [0, 2.25, 2.5], ease: ["linear", "easeIn"] },
  },
};

/** Concept 2 — paper. The rip runs right to left before anything swings:
 *  the piece shears (skewY about the hinge) so its right side droops while
 *  the left stays on the perforation, like paper peeling off the dashes.
 *  Then it drops into the hang against air (ease-in-out, not gravity),
 *  straightens, and swings slower and heavier damped than a pendulum
 *  would. The fall is a drift: slow, with a sideways flutter and wobble,
 *  fading as it goes. */
const concept2: TearConcept = {
  name: "Paper",
  hinge: "12px 0px",
  duration: 4.7,
  fallAt: 3.5,
  gapClose: { duration: 0.7, ease: [0.2, 0, 0, 1] },
  tracks: {
    // The rip: right side droops as the tear front travels left.
    skewY: {
      values: [0, 9, 0],
      at: [0, 0.9, 1.7],
      ease: [[0.6, 0, 0.9, 0.4], "easeOut"],
    },
    rotate: {
      values: [0, 6, 76, 62, 72, 66.5, 69.5, REST_ANGLE, REST_ANGLE, 82, 74, 88],
      at: [0, 0.9, 1.7, 2.05, 2.4, 2.7, 3.0, 3.2, 3.5, 3.9, 4.3, 4.7],
      ease: [
        "easeIn",
        [0.4, 0, 0.6, 1],
        "easeInOut", "easeInOut", "easeInOut", "easeInOut", "easeInOut",
        "linear",
        "easeInOut", "easeInOut", "easeInOut",
      ],
    },
    x: { values: [0, 0, -24, 10, -30], at: [0, 3.5, 3.9, 4.3, 4.7], ease: ["linear", "easeInOut", "easeInOut", "easeInOut"] },
    y: { values: [0, 0, 520], at: [0, 3.5, 4.7], ease: ["linear", [0.5, 0, 0.75, 0.9]] },
    opacity: { values: [1, 1, 0], at: [0, 4.1, 4.7], ease: ["linear", "easeIn"] },
  },
};

/** Concept 3 — split. No hinge: the piece pulls straight down off the
 *  perforation with a small wobble and settles a card-gap below; the stub
 *  recoils up and resettles as it lets go. After a beat the piece slides
 *  out to the right, turning as it goes, while the gap closes. */
const concept3: TearConcept = {
  name: "Split",
  hinge: "50% 50%",
  duration: 1.9,
  fallAt: 1.2,
  gapClose: { duration: 0.5, ease: [0.2, 0, 0, 1] },
  tracks: {
    y: {
      values: [0, 16, 11, 13, 12, 12, 40],
      at: [0, 0.4, 0.6, 0.75, 0.9, 1.2, 1.9],
      ease: ["easeOut", "easeInOut", "easeInOut", "easeInOut", "linear", "easeIn"],
    },
    rotate: {
      values: [0, -1.6, 1.1, -0.5, 0, 0, 14],
      at: [0, 0.4, 0.6, 0.75, 0.9, 1.2, 1.9],
      ease: ["easeOut", "easeInOut", "easeInOut", "easeInOut", "linear", [0.5, 0, 0.85, 0.5]],
    },
    x: { values: [0, 0, 460], at: [0, 1.2, 1.9], ease: ["linear", [0.5, 0, 0.85, 0.5]] },
    opacity: { values: [1, 1, 0], at: [0, 1.55, 1.9], ease: ["linear", "easeIn"] },
  },
  stub: {
    hinge: "50% 100%",
    tracks: {
      y: {
        values: [0, 0, -5, 2, -1, 0],
        at: [0, 0.15, 0.35, 0.55, 0.7, 0.9],
        ease: ["linear", "easeOut", "easeInOut", "easeInOut", "easeInOut"],
      },
      rotate: {
        values: [0, 0, 0.5, -0.25, 0],
        at: [0, 0.15, 0.4, 0.6, 0.85],
        ease: ["linear", "easeOut", "easeInOut", "easeInOut"],
      },
    },
  },
};

export const TEAR_CONCEPTS = [concept1, concept2, concept3] as const;
export type TearConceptId = 1 | 2 | 3;
export const DEFAULT_TEAR_CONCEPT: TearConceptId = 3;
export const tearConcept = (id: TearConceptId): TearConcept => TEAR_CONCEPTS[id - 1];

/** Framer `animate` + `transition` from a track set on the concept's clock. */
export function tearAnimation(tracks: TearTracks, duration: number) {
  const animate: Record<string, number[]> = {};
  const transition: Record<string, { duration: number; times: number[]; ease: Easing | Easing[] }> = {};
  for (const [prop, track] of Object.entries(tracks)) {
    animate[prop] = track.values;
    transition[prop] = {
      duration,
      times: track.at.map((s) => s / duration),
      ease: track.ease,
    };
  }
  return { animate, transition };
}
