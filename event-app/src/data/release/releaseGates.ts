"use client";

import { useSyncExternalStore } from "react";
import { useUser } from "@/data/auth/useUser";
import { readPref, writePref } from "@/data/prefs";

/**
 * Features that ship in the build but are not open to attendees yet. Flip a
 * value to true to release it to everyone. Until then nobody sees it, the EF
 * team included: an @ethereum.org account sees the app as attendees do, and
 * turns an unreleased feature on for its own device in EF internal tools
 * (My Devcon) to test it in production. UI gate only: anything a feature
 * calls server-side keeps its own checks.
 */
export const RELEASED = {
  /** ENS perk card on My Devcon (free .eth names). */
  ensPerk: false,
  /** Testnet faucet perk card on My Devcon. */
  faucetPerk: false,
  /** Venue map tab; attendees get a "coming soon" placeholder instead. */
  venueMap: false,
  /** The rebuilt map on the JWCC plans (src/app/(page-layout)/map/venue-map) in place of the prototype. */
  venueMapNext: false,
} as const;

export type ReleaseGate = keyof typeof RELEASED;

/** How EF internal tools lists each feature. */
export const RELEASE_GATE_LABELS: Record<ReleaseGate, { name: string; description: string }> = {
  ensPerk: { name: "ENS perk", description: "The free .eth name card on My Devcon." },
  faucetPerk: { name: "Testnet faucet", description: "The testnet faucet perk card on My Devcon." },
  venueMap: { name: "Venue map", description: "The Map tab instead of its “coming soon” placeholder." },
  venueMapNext: { name: "New venue map (JWCC)", description: "The rebuilt map on the JWCC plans instead of the prototype; needs Venue map on." },
};

const TEAM_DOMAIN = "@ethereum.org";

/** True when the signed-in account is on the EF team (@ethereum.org). */
export function useIsTeam(): boolean {
  const { user } = useUser();
  return !!user?.email?.toLowerCase().endsWith(TEAM_DOMAIN);
}

// The features this device previews, in the Dexie prefs table so the choice
// survives restarts and works offline. Loaded once, then kept in memory so
// every gate re-renders at once when a toggle flips.
const PREVIEW_PREF_KEY = "release.preview";
let previews: readonly ReleaseGate[] = [];
const listeners = new Set<() => void>();
let loaded = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) {
    loaded = true;
    void readPref<ReleaseGate[]>(PREVIEW_PREF_KEY).then((stored) => {
      if (!stored?.length) return;
      previews = stored.filter((f): f is ReleaseGate => f in RELEASED);
      listeners.forEach((l) => l());
    });
  }
  return () => listeners.delete(listener);
}

const NONE: readonly ReleaseGate[] = [];

/** The unreleased features this device previews (EF internal tools). */
export function usePreviewedFeatures(): readonly ReleaseGate[] {
  return useSyncExternalStore(subscribe, () => previews, () => NONE);
}

/** Turn a feature preview on or off for this device. */
export function setFeaturePreview(feature: ReleaseGate, on: boolean) {
  previews = on ? [...previews.filter((f) => f !== feature), feature] : previews.filter((f) => f !== feature);
  void writePref(PREVIEW_PREF_KEY, previews);
  listeners.forEach((l) => l());
}

/**
 * True when the feature is released, or the signed-in account is on the EF
 * team and previews it on this device. Signing out (or into a non-team
 * account) drops the preview without clearing it.
 */
export function useReleased(feature: ReleaseGate): boolean {
  const team = useIsTeam();
  const previewed = usePreviewedFeatures();
  return RELEASED[feature] || (team && previewed.includes(feature));
}
