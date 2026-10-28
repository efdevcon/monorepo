import type { ReleaseGate } from "./releaseGates";

/** The EF team: previews every unreleased feature. */
export const TEAM_DOMAIN = "@ethereum.org";

/**
 * Partner teams that may preview one unreleased feature on their own device,
 * by email domain: the feature is theirs to test before it is released.
 */
export const PARTNER_PREVIEW_DOMAINS: Partial<Record<ReleaseGate, readonly string[]>> = {
  ensPerk: ["@ens.domains"],
};

function hasDomain(email: string | null | undefined, domain: string): boolean {
  return !!email && email.toLowerCase().endsWith(domain.toLowerCase());
}

export function isTeamEmail(email: string | null | undefined): boolean {
  return hasDomain(email, TEAM_DOMAIN);
}

/**
 * The unreleased features the signed-in account may preview: all of them for
 * the team, a partner's own feature for a partner domain, none otherwise.
 */
export function previewableGates(
  email: string | null | undefined,
  unreleased: readonly ReleaseGate[]
): ReleaseGate[] {
  if (isTeamEmail(email)) return [...unreleased];
  return unreleased.filter((gate) =>
    (PARTNER_PREVIEW_DOMAINS[gate] ?? []).some((domain) => hasDomain(email, domain))
  );
}
