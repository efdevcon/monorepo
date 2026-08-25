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
  /** True when the tier alone decides it, with no onchain lookup needed. */
  immediate: boolean;
};

/**
 * The partner's own business rules — nothing here is our concern, it just shows
 * the two branches the tier is there to support.
 *
 * India tickets get a sponsored registration outright. Everyone else is graded
 * on how long they have held an ENS name, which the partner reads onchain from
 * the wallet the attendee connects. We are not involved in that half at all,
 * and deliberately so: it needs no ticket data.
 */
export function perkFor(tier: TicketTier, yearsHeld: number | null): PerkOffer {
  if (tier === "india") {
    return {
      headline: "Sponsored .eth registration",
      detail:
        "India ticket holders get their first name registered on us, no wallet history required.",
      immediate: true,
    };
  }

  if (yearsHeld === null) {
    return {
      headline: "Connect a wallet to see your gift",
      detail:
        "Gifts are graded on how long you have held an ENS name. Connect a wallet to check.",
      immediate: false,
    };
  }

  if (yearsHeld >= 5) {
    return {
      headline: "Founding-era gift bundle",
      detail: `${yearsHeld} years of ENS ownership — the top tier: limited-edition hardware and onsite pickup.`,
      immediate: false,
    };
  }
  if (yearsHeld >= 3) {
    return {
      headline: "Long-holder gift bundle",
      detail: `${yearsHeld} years of ENS ownership — apparel plus the sticker set.`,
      immediate: false,
    };
  }
  if (yearsHeld >= 1) {
    return {
      headline: "Holder sticker set",
      detail: `${yearsHeld} year${yearsHeld === 1 ? "" : "s"} of ENS ownership — collect the sticker set at the booth.`,
      immediate: false,
    };
  }
  return {
    headline: "No gift tier matched",
    detail:
      "We couldn't find an ENS name held by this wallet. Register one at the booth to qualify next time.",
    immediate: false,
  };
}

/**
 * One perk per ticket, first claim wins.
 *
 * This is the actual anti-replay defense, and it has to live on the partner
 * side because they own the giveaway. The proof's expiry only stops a link
 * being hoarded and reshared days later; it does nothing about the same link
 * being redeemed twice inside the window. The identifier is stable per ticket
 * precisely so this check works.
 *
 * In-memory for the POC, which means it resets on restart and is per-instance —
 * so on serverless it would not actually hold. Production needs a real unique
 * constraint on the identifier in a database, not a Map.
 */
type ClaimRow = { at: number; tier: TicketTier };

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

export function isClaimed(identifier: string): boolean {
  return claimed.has(identifier);
}

export function claimRecord(identifier: string) {
  return claimed.get(identifier) ?? null;
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

/** Returns false if this identifier was already spent. */
export function markClaimed(identifier: string, tier: TicketTier): boolean {
  if (claimed.has(identifier)) return false;
  claimed.set(identifier, { at: Date.now(), tier });
  return true;
}

export type PartnerCheck =
  | { state: "no-proof" }
  | { state: "unconfigured" }
  | { state: "rejected"; reason: string }
  | { state: "expired" }
  | { state: "already-claimed"; tier: TicketTier; at: number }
  | { state: "ok"; tier: TicketTier; identifier: string; event: string };

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

  const existing = claimRecord(proof.identifier);
  if (existing) {
    return {
      state: "already-claimed",
      tier: existing.tier,
      at: existing.at,
    };
  }

  return {
    state: "ok",
    tier: proof.tier,
    identifier: proof.identifier,
    event: proof.event,
  };
}
