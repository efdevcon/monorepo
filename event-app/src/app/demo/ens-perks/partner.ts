import { headers } from "next/headers";
import {
  verifyTicketProof,
  type TicketProof,
  type TicketTier,
} from "@/app/api/ticket-proof/proof";

/**
 * The partner half of the integration, in one file, standing in for what ENS
 * would run on their own infrastructure.
 *
 * Note what it needs from us: our public signer address, and the three pure
 * functions in `proof.ts` that parse and check a proof
 * (`proofFromSearchParams`, `proofPayloadHash`, `verifyTicketProof`). It never
 * needs the signing key or the identifier salt — those are issuer-only. A real
 * partner would reimplement these few functions against ethers/viem rather than
 * importing ours.
 */

/**
 * Resolve the signer address the partner trusts.
 *
 * A real partner pins this: hardcoded in config, or fetched once at deploy time
 * and cached. It must never come from the proof link — checking a signature
 * against an address carried alongside it proves only that the two are
 * self-consistent, so anyone could sign with their own key, pass their own
 * address, and pass verification. That is why the address isn't in the URL at
 * all.
 */
export async function resolvePinnedSigner(): Promise<string | null> {
  const pinned = process.env.DEMO_PINNED_SIGNER;
  if (pinned) return pinned;

  // Demo convenience only: discover it from the issuer's public endpoint. In
  // production this fetch is a deploy-time step, not a per-request one — an
  // attacker able to intercept it could otherwise swap in their own address.
  try {
    const host = (await headers()).get("host");
    if (!host) return null;
    const proto = host.startsWith("localhost") ? "http" : "https";
    const res = await fetch(`${proto}://${host}/api/ticket-proof/signer`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.signerAddress ?? null;
  } catch {
    return null;
  }
}

export type PerkOffer = {
  headline: string;
  detail: string;
};

/**
 * The partner's own example business rules — nothing here is our concern, it
 * just shows the two branches the tier is there to support: verified local
 * attendees get a subsidized first-year .eth registration, everyone else is
 * graded on how many years remain on an ENS name the connected wallet
 * controls. The onchain half (name registration, expiry lookup) is the
 * partner's alone and deliberately needs no ticket data, so it is stubbed.
 */
export const MIN_SUBSIDIZED_NAME_LENGTH = 5;
export const FRENS_MIN_YEARS_REMAINING = 10;

/** Normalize a picked name to its bare label ("Noor.eth " -> "noor"). */
export function toNameLabel(name: string): string {
  return name.trim().toLowerCase().replace(/\.eth$/, "");
}

/** null = qualifies; otherwise the reason it doesn't. */
export function subsidizedNameProblem(name: string): string | null {
  const label = toNameLabel(name);
  if (!label) return "Pick a name first";
  if (label.length < MIN_SUBSIDIZED_NAME_LENGTH) {
    return `Subsidized names are ${MIN_SUBSIDIZED_NAME_LENGTH}+ characters — shorter names are premium-priced, beyond the $8/year the subsidy covers`;
  }
  if (!/^[a-z0-9-]+$/.test(label)) {
    return "Names can only contain letters, digits and hyphens";
  }
  return null;
}

export type PerkKind = "subsidy" | "frens";

/**
 * Which perks a tier can claim. The two are independent, not exclusive:
 * verified local attendees can claim the subsidized name AND, if a wallet
 * they connect already controls a long-registered name, the frENS reward.
 */
export function eligiblePerks(tier: TicketTier): PerkKind[] {
  return tier === "india" ? ["subsidy", "frens"] : ["frens"];
}

/**
 * A refusal grants nothing and therefore must not spend the claim — the
 * attendee can fix the input (or extend their registration) and try again
 * with the same proof.
 */
export function perkFor(
  perk: PerkKind,
  input: { ensName?: string | null; yearsRemaining?: number | null }
): PerkOffer | { refused: string } {
  if (perk === "subsidy") {
    const problem = subsidizedNameProblem(input.ensName ?? "");
    if (problem) return { refused: problem };
    return {
      headline: `${toNameLabel(input.ensName ?? "")}.eth is yours`,
      detail:
        "First year's registration ($8/year) is on us — one per verified local attendee. It registers to the wallet connected in the Devcon app, and renewals after year one are yours.",
    };
  }

  const yearsRemaining = input.yearsRemaining;
  if (yearsRemaining === null || yearsRemaining === undefined) {
    return {
      refused:
        "Connect the wallet that controls your .eth name so its remaining registration can be checked",
    };
  }
  if (yearsRemaining >= FRENS_MIN_YEARS_REMAINING) {
    return {
      headline: "frENS reward unlocked",
      detail: `${yearsRemaining} years remaining on your name — that's a long-term user. Collect your ENS frens plushie (or premium swag, while it lasts) at badge pickup. One reward per verified attendee.`,
    };
  }
  return {
    refused: `The frENS reward is for names with ${FRENS_MIN_YEARS_REMAINING}+ years remaining (this one has ${yearsRemaining}). Multi-year discounts for ENS names will be available — extend and come back.`,
  };
}

/**
 * One claim per perk per ticket, first claim wins.
 *
 * This is the actual anti-replay defense, and it has to live on the partner
 * side because they own the giveaway. The proof's expiry only stops a link
 * being hoarded and reshared days later; it does nothing about the same link
 * being redeemed twice inside the window. The identifier is stable per ticket
 * precisely so this check works. Keyed by (identifier, perk) rather than the
 * identifier alone, because the perks are independent: claiming the subsidy
 * must not spend the frENS reward.
 *
 * In-memory for the POC, which means it resets on restart and is per-instance —
 * so on serverless it would not actually hold. Production needs a real unique
 * constraint on (identifier, perk) in a database, not a Map.
 */
type ClaimRow = { at: number; tier: TicketTier; perk: PerkKind };

const claimKey = (identifier: string, perk: PerkKind) =>
  `${identifier}:${perk}`;

/**
 * Hung off `globalThis` rather than being a plain module-level Map, because the
 * page and the claim route land in separate server bundles: a module-scoped Map
 * gives each of them its own copy, so a claim recorded by the route was
 * invisible to the page and the "already claimed" state never rendered. Same
 * reason the Next.js docs hang a database client here. Survives HMR too.
 */
const claimed: Map<string, ClaimRow> = ((
  globalThis as typeof globalThis & {
    __demoPartnerClaims?: Map<string, ClaimRow>;
  }
).__demoPartnerClaims ??= new Map());

export function claimRecord(identifier: string, perk: PerkKind) {
  return claimed.get(claimKey(identifier, perk)) ?? null;
}

/**
 * Wipe the demo's spent-set. Exists because the whole point of the store is to
 * refuse a second claim, which makes the demo single-use per ticket until
 * something clears it — and restarting the server to demo it twice is a silly
 * way to spend a meeting.
 */
export function resetClaims(): number {
  const n = claimed.size;
  claimed.clear();
  return n;
}

/** Returns false if this perk was already claimed by this ticket. */
export function markClaimed(
  identifier: string,
  perk: PerkKind,
  tier: TicketTier
): boolean {
  const key = claimKey(identifier, perk);
  if (claimed.has(key)) return false;
  claimed.set(key, { at: Date.now(), tier, perk });
  return true;
}

export type PartnerCheck =
  | { state: "no-proof" }
  | { state: "unconfigured" }
  | { state: "rejected"; reason: string }
  | { state: "expired" }
  | { state: "already-claimed"; tier: TicketTier; at: number }
  | {
      state: "ok";
      tier: TicketTier;
      identifier: string;
      event: string;
      /** Perks this ticket has already spent (its other perks remain open). */
      claimedPerks: PerkKind[];
    };

/** Full partner-side gate for an incoming proof. */
export async function checkProof(
  proof: TicketProof | null
): Promise<PartnerCheck> {
  if (!proof) return { state: "no-proof" };

  const signer = await resolvePinnedSigner();
  if (!signer) return { state: "unconfigured" };

  const verdict = await verifyTicketProof(proof, signer);
  if (!verdict.valid) return { state: "rejected", reason: verdict.reason };
  if (verdict.expired) return { state: "expired" };

  const perks = eligiblePerks(proof.tier);
  const rows = perks
    .map((perk) => ({ perk, row: claimRecord(proof.identifier, perk) }))
    .filter((r) => r.row !== null);
  if (rows.length === perks.length) {
    return {
      state: "already-claimed",
      tier: proof.tier,
      at: Math.max(...rows.map((r) => r.row!.at)),
    };
  }

  return {
    state: "ok",
    tier: proof.tier,
    identifier: proof.identifier,
    event: proof.event,
    claimedPerks: rows.map((r) => r.perk),
  };
}
