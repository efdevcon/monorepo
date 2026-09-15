"use client";

import { useEffect, useState } from "react";

/**
 * "+1" pulse for the mobile My Interests pill: the interest hooks announce an
 * addition here, the page's header pill listens and plays the bubble. A
 * window event rather than shared state: the toggles run in list cards,
 * the timeline, detail pages and speaker cards, and only the visible page's
 * header should react.
 */
export type InterestKind = "session" | "speaker";

const EVENT = "dc:interest-added";

export function emitInterestAdded(kind: InterestKind) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<InterestKind>(EVENT, { detail: kind }));
}

export interface InterestPulse {
  /** Changes per addition so a fresh bubble mounts even mid-animation. */
  key: number;
  label: string;
}

/**
 * The pulse to render for `kind`, or null. `enabled` false (hidden pane,
 * detail page open) ignores additions instead of queueing them.
 */
export function useInterestPulse(
  kind: InterestKind,
  enabled: boolean
): [InterestPulse | null, () => void] {
  const [pulse, setPulse] = useState<InterestPulse | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const onAdded = (e: Event) => {
      if ((e as CustomEvent<InterestKind>).detail !== kind) return;
      setPulse((prev) => ({ key: (prev?.key ?? 0) + 1, label: "+1" }));
    };
    window.addEventListener(EVENT, onAdded);
    return () => window.removeEventListener(EVENT, onAdded);
  }, [kind, enabled]);
  return [pulse, () => setPulse(null)];
}
