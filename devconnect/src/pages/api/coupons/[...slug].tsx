import { deserializeProofResult } from '../../../common/components/perks/serialize'
import {
  getDevconTicketProofRequest,
  getDevconnectTicketProofRequest,
} from '../../../common/components/perks/ticketProof'
import { gpcVerify } from '@pcd/gpc'
import { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'
// @ts-ignore ffjavascript does not have types
import { getCurveFromName } from 'ffjavascript'
import perksList from 'common/components/perks/perks-list'

const GPC_ARTIFACTS_PATH = path.join(process.cwd(), 'public/artifacts')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { slug } = req.query
  const proofId = Array.isArray(slug) ? slug.join('/') : slug

  if (!proofId) {
    return res.status(400).json({ error: 'Proof ID is required' })
  }

  const perks = perksList.filter(perk => perk.zupass_proof_id === proofId)

  if (!perks.length) {
    return res.status(400).json({ error: 'Perks not found for proof ID' })
  }

  const serializedProofResult = JSON.stringify(req.body)

  const { boundConfig, revealedClaims, proof } = deserializeProofResult(serializedProofResult)

  const request =
    proofId === 'Devcon SEA'
      ? getDevconTicketProofRequest().getProofRequest()
      : getDevconnectTicketProofRequest().getProofRequest()

  // Multi-threaded verification seems to be broken in NextJS, so we need to
  // initialize the curve in single-threaded mode.

  // @ts-ignore
  if (!globalThis.curve_bn128) {
    // @ts-ignore
    globalThis.curve_bn128 = getCurveFromName('bn128', { singleThread: true })
  }

  const result = await gpcVerify(
    proof,
    {
      ...request.proofConfig,
      circuitIdentifier: boundConfig.circuitIdentifier,
    },
    revealedClaims,
    GPC_ARTIFACTS_PATH
  )

  //   console.log(result, 'result')

  if (result === true) {
    // Generate coupon code based on the collection
    const coupons = getCoupons(proofId, revealedClaims.owner?.nullifierHashV4?.toString() ?? '')

    console.log(`Verified proof: ${proofId}`)

    return res.status(200).json({
      verified: true,
      coupons,
      ticket_type: proofId,
    })
  }

  return res.status(400).json({
    verified: false,
    error: 'Proof verification failed',
  })
}

// Mock database of coupons
function getCoupons(proofId: string, nullifierHashV4: string) {
  const coupons = perksList.filter(perk => perk.zupass_proof_id === proofId)

  return coupons.reduce((lookup, perk) => {
    lookup[perk.coupon_collection] = generateCouponCode(perk.coupon_collection)
    return lookup
  }, {} as Record<string, string>)
}

function generateCouponCode(collection: string): string {
  // Generate a unique coupon code based on collection and timestamp
  const timestamp = Date.now().toString(36)
  const collectionPrefix = collection
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 4)
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()

  return `${collectionPrefix}-${timestamp}-${randomSuffix}`
}
