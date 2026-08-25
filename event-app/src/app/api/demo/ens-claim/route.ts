import { NextRequest, NextResponse } from "next/server";
import { proofFromSearchParams } from "@/app/api/ticket-proof/proof";
import {
  checkProof,
  markClaimed,
  perkFor,
  resetClaims,
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
    const yearsHeld =
      body && typeof body.yearsHeld === "number" ? body.yearsHeld : null;

    const proof = proofFromSearchParams(new URLSearchParams(proofParams));
    const check = await checkProof(proof);

    if (check.state !== "ok") {
      const messages: Record<string, string> = {
        "no-proof": "No proof supplied",
        unconfigured: "Verifier not configured",
        rejected: "Proof rejected",
        expired: "Proof expired — generate a fresh link",
        "already-claimed": "This ticket has already claimed its perk",
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

    const perk = perkFor(check.tier, check.tier === "india" ? null : yearsHeld);

    // Spend the identifier last, and only on a perk we are actually granting.
    // `markClaimed` returning false means another request won the race.
    if (!markClaimed(check.identifier, check.tier)) {
      return NextResponse.json(
        { success: false, error: "This ticket has already claimed its perk" },
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
