import { NextResponse } from "next/server";
import { PROOF_DOMAIN, PROOF_VERSION, getSignerAddress } from "../proof";

/**
 * Publishes the public address partners pin to verify our proofs, plus the
 * domain separator and wire version so an integrator can confirm they are
 * checking the same payload format we sign.
 *
 * Public on purpose: it is a public key. It exists so a partner can fetch and
 * cache the address once during setup instead of reading it out of the proof
 * link, which would make verification circular and forgeable.
 *
 * Partners should pin the value, not fetch it per request — an attacker who can
 * MITM this endpoint could otherwise substitute their own address.
 */
export const revalidate = 3600;

export async function GET() {
  try {
    return NextResponse.json(
      {
        success: true,
        data: {
          signerAddress: getSignerAddress(),
          domain: PROOF_DOMAIN,
          version: PROOF_VERSION,
        },
      },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch (err) {
    console.error("[/api/ticket-proof/signer] error:", err);
    return NextResponse.json(
      { success: false, error: "Signing key not configured" },
      { status: 503 }
    );
  }
}
