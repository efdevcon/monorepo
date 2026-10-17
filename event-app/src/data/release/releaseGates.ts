"use client";

import { useUser } from "@/data/auth/useUser";

/**
 * Features that ship in the build but are not open to attendees yet. Flip a
 * value to true to release it to everyone; until then only signed-in
 * @ethereum.org accounts see it, so the team can keep testing in production.
 * UI gate only: anything a feature calls server-side keeps its own checks.
 */
export const RELEASED = {
  /** ENS perk card on My Devcon (free .eth names). */
  ensPerk: false,
  /** Venue map tab; attendees get a "coming soon" placeholder instead. */
  venueMap: false,
} as const;

export type ReleaseGate = keyof typeof RELEASED;

const TEAM_DOMAIN = "@ethereum.org";

/** True when the signed-in account is on the EF team (@ethereum.org). */
export function useIsTeam(): boolean {
  const { user } = useUser();
  return !!user?.email?.toLowerCase().endsWith(TEAM_DOMAIN);
}

/** True when the feature is released, or the signed-in account is on the EF team. */
export function useReleased(feature: ReleaseGate): boolean {
  const team = useIsTeam();
  return RELEASED[feature] || team;
}
