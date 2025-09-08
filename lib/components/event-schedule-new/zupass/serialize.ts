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
import { PODData } from "@parcnet-js/podspec";

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

/**
 * Serialize POD data for transmission to the server
 * @param podData - The POD data to serialize
 * @returns A JSON string representing the POD data
 */
export function serializePodData(podData: PODData): string {
  return JSON.stringify(podData, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    return value
  });
}

/**
 * Deserialize POD data from server response
 * @param serializedPodData - The serialized POD data string
 * @returns The deserialized POD data
 */
export function deserializePodData(serializedPodData: string): PODData {
  return JSON.parse(serializedPodData, (key, value) => {
    // Check if this is a POD entry with type information
    if (value && typeof value === 'object' && 'type' in value && 'value' in value) {
      const entry = value as { type: string; value: any }
      
      // Convert value back to BigInt based on the type
      if (entry.type === 'int' && typeof entry.value === 'string') {
        return {
          ...entry,
          value: BigInt(entry.value)
        }
      }
    }
    return value
  });
}