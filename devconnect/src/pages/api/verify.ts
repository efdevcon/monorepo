import { deserializeProofResult } from "../../common/components/perks/serialize";
import { getTicketProofRequest } from "../../common/components/perks/ticketProof";
import { gpcVerify } from "@pcd/gpc";
import { NextApiRequest, NextApiResponse } from "next";
import path from "path";
// @ts-ignore ffjavascript does not have types
import { getCurveFromName } from "ffjavascript";

const GPC_ARTIFACTS_PATH = path.join(process.cwd(), "public/artifacts");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { serializedProofResult } = JSON.parse(req.body);

  const { boundConfig, revealedClaims, proof } = deserializeProofResult(
    serializedProofResult
  );

  const request = getTicketProofRequest().getProofRequest();

  // Multi-threaded verification seems to be broken in NextJS, so we need to
  // initialize the curve in single-threaded mode.

  // @ts-ignore
  if (!globalThis.curve_bn128) {
    // @ts-ignore
    globalThis.curve_bn128 = getCurveFromName("bn128", { singleThread: true });
  }

  const result = await gpcVerify(
    proof,
    {
      ...request.proofConfig,
      circuitIdentifier: boundConfig.circuitIdentifier,
    },
    revealedClaims,
    GPC_ARTIFACTS_PATH
  );

  if (result === true) {
    // do the thing you want to do with the proof
    // maybe you want to issue a discount code to the user, in that case:
    // you need a backend database to store nullifiers and/or ticketIds and a place to store discount codes.
    // See https://github.com/robknight/zupass-discount-codes/blob/main/src/app/api/verify/route.ts for an example.
    console.log("verified");
  }

  return res.status(200).json({ verified: result });
}