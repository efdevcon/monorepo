import { ParcnetAPI } from "@parcnet-js/app-connector";
import {
  boundConfigToJSON,
  revealedClaimsToJSON,
  GPCBoundConfig,
  GPCRevealedClaims,
  boundConfigFromJSON,
  revealedClaimsFromJSON,
  GPCProof,
} from "@pcd/gpc";

export type ProveResult = Extract<
  Awaited<ReturnType<ParcnetAPI["gpc"]["prove"]>>,
  { success: true }
>;

/**
 * Serialize a proof result for transmission to the server
 * @param result - The proof result to serialize
 * @returns A JSON string representing the proof result
 */
export function serializeProofResult(result: ProveResult): string {
  const serializedProofResult = {
    proof: result.proof,
    serializedBoundConfig: boundConfigToJSON(result.boundConfig),
    serializedRevealedClaims: revealedClaimsToJSON(result.revealedClaims),
  };
  return JSON.stringify(serializedProofResult);
}

export function deserializeProofResult(result: string): {
  boundConfig: GPCBoundConfig;
  revealedClaims: GPCRevealedClaims;
  proof: GPCProof;
} {
  const proofResult = JSON.parse(result);
  return {
    boundConfig: boundConfigFromJSON(proofResult.serializedBoundConfig),
    revealedClaims: revealedClaimsFromJSON(proofResult.serializedRevealedClaims),
    proof: proofResult.proof,
  };
}