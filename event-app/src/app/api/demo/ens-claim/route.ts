import { NextRequest, NextResponse } from "next/server";
import { proofFromSearchParams } from "@/app/api/ticket-proof/proof";
import {
  checkProof,
  eligiblePerks,
  markClaimed,
  perkFor,
  resetClaims,
  type PerkKind,
} from "@/app/demo/ens-perks/partner";

/**
 * Partner-side claim endpoint, part of the reference implementation.
 *
 * Re-verifies from scratch rather than trusting anything the page decided. The
 * page's render is just a preview: a client can POST here directly, so the
 * signature check, the expiry check and the spent-set check all have to happen
 * again at the point where the perk is actually granted.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const proofParams =
      body && typeof body.proofParams === "string" ? body.proofParams : "";
    const perkKind: PerkKind | null =
      body && (body.perk === "subsidy" || body.perk === "frens")
        ? body.perk
        : null;
    const ensName =
      body && typeof body.ensName === "string" ? body.ensName : null;
    const yearsRemaining =
      body && typeof body.yearsRemaining === "number"
        ? body.yearsRemaining
        : null;

    if (!perkKind) {
      return NextResponse.json(
        { success: false, error: "Unknown perk" },
        { status: 400 }
      );
    }

    const proof = proofFromSearchParams(new URLSearchParams(proofParams));
    const check = await checkProof(proof);

    if (check.state !== "ok") {
      const messages: Record<string, string> = {
        "no-proof": "No proof supplied",
        unconfigured: "Verifier not configured",
        rejected: "Proof rejected",
        expired: "Proof expired — generate a fresh link",
        "already-claimed":
          "This ticket has already claimed everything it is eligible for",
      };
      return NextResponse.json(
        {
          success: false,
          error:
            check.state === "rejected"
              ? `Proof rejected: ${check.reason}`
              : messages[check.state],
        },
        { status: check.state === "already-claimed" ? 409 : 400 }
      );
    }

    // Eligibility is the tier's, not the caller's, to assert: the subsidy is
    // for verified local attendee tickets only.
    if (!eligiblePerks(check.tier).includes(perkKind)) {
      return NextResponse.json(
        { success: false, error: "This ticket isn't eligible for that perk" },
        { status: 403 }
      );
    }

    const perk = perkFor(perkKind, { ensName, yearsRemaining });

    // A refusal (name too short, not enough years remaining) grants nothing,
    // so it must not spend the ticket — the attendee can fix the input and
    // try again with the same proof.
    if ("refused" in perk) {
      return NextResponse.json(
        { success: false, error: perk.refused },
        { status: 400 }
      );
    }

    // Spend the identifier last, and only on a perk we are actually granting.
    // `markClaimed` returning false means another request won the race.
    if (!markClaimed(check.identifier, perkKind, check.tier)) {
      return NextResponse.json(
        { success: false, error: "This ticket has already claimed that perk" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { headline: perk.headline, detail: perk.detail },
    });
  } catch (err) {
    console.error("[/api/demo/ens-claim] error:", err);
    return NextResponse.json(
      { success: false, error: "Claim failed" },
      { status: 500 }
    );
  }
}

/**
 * Clear the demo's spent-set so the same ticket can claim again.
 *
 * Demo-only, and it only exists because the spent-set is deliberately
 * write-once. Nothing in the issuing side (`/api/ticket-proof`) is affected —
 * this is the partner's own bookkeeping, and in production it would be a
 * database the partner owns, with no endpoint like this anywhere near it.
 */
export async function DELETE() {
  const cleared = resetClaims();
  return NextResponse.json({ success: true, data: { cleared } });
}
