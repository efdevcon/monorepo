import type { NextApiRequest, NextApiResponse } from 'next'
import {
  verify,
  init,
  artifactUrls,
  ArtifactsOrigin,
  InitArgs,
} from '@anon-aadhaar/core'
import { validateDiscountCode, assignVoucher, claimDiscountCode, getAssignedVoucher } from '../../../services/discountStore'
import { TICKETING } from 'config/ticketing'

// Indian government public key hash for Aadhaar QR verification (production)
const pubKeyHash =
  '18063425702624337643644061197836918910810808173893535653269228433734128853484'

// From test signing RSA keys located in /circuits/asset/testPublicKey.pem
const testPublicKeyHash =
  '15134874015316324267425466444584014077184337590635665158241104437045239495873'

const allowedPubKeyHashes = new Set([pubKeyHash, testPublicKeyHash])

// AnonAadhaarCore-like payload from client (see @anon-aadhaar/core)
type ProofPayload = {
  proof: {
    nullifier: string
    pubkeyHash: string
    timestamp: string
    nullifierSeed: number
    ageAbove18: string
  }
  [key: string]: unknown
}

async function verifyAnonAadhaarProof(proofPayload: ProofPayload): Promise<boolean> {
  const useTestAadhaar = proofPayload.proof.pubkeyHash === testPublicKeyHash
  // verify() from @anon-aadhaar/core validates the ZK proof; pass test flag for test Aadhaar proofs
  const valid = await verify(proofPayload as any, useTestAadhaar)
  if (!valid) return false

  if (!allowedPubKeyHashes.has(proofPayload.proof.pubkeyHash)) return false

  const ageSeconds = Math.floor(Date.now() / 1000) - Number(proofPayload.proof.timestamp)
  if (ageSeconds > 24 * 60 * 60) return false

  // For production proofs, enforce nullifier seed from env; skip for test Aadhaar
  if (!useTestAadhaar) {
    const expectedSeed = TICKETING.aadhaar.nullifierSeed
    const proofSeed = Number(proofPayload.proof.nullifierSeed)
    if (proofSeed !== expectedSeed) return false
  }

  return true
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { anonAadhaarProof } = req.body as { anonAadhaarProof: ProofPayload }

  if (!anonAadhaarProof?.proof) {
    return res.status(400).json({ error: 'Missing anonAadhaarProof' })
  }

  const initArgs: InitArgs = {
    wasmURL: artifactUrls.v2.wasm,
    zkeyURL: artifactUrls.v2.zkey,
    vkeyURL: artifactUrls.v2.vk,
    artifactsOrigin: ArtifactsOrigin.server,
  }

  await init(initArgs)

  let verified = false
  try {
    verified = await verifyAnonAadhaarProof(anonAadhaarProof)
  } catch (e) {
    return res.status(409).json({ error: (e as Error).message })
  }

  if (!verified) {
    return res.status(401).json({ error: 'Unauthorized, your proof is not valid.' })
  }

  // Require that the proof reveals age >= 18
  if (anonAadhaarProof.proof.ageAbove18 !== '1') {
    return res.status(401).json({ error: 'You must be 18 or older to purchase a ticket.' })
  }

  // Dynamic voucher assignment from Supabase pool
  const { discountCode } = req.body as { discountCode?: string }
  const nullifier = anonAadhaarProof.proof.nullifier

  if (!discountCode) {
    return res.status(400).json({ error: 'Missing discount code' })
  }

  const validCode = await validateDiscountCode(discountCode)
  if (!validCode) {
    return res.status(400).json({ error: 'Invalid or already used discount code' })
  }

  // Check if this identity already has a voucher (one-voucher-per-identity)
  const existingVoucher = await getAssignedVoucher(nullifier)
  if (existingVoucher) {
    return res.status(200).json({ voucherCode: existingVoucher.code })
  }

  const voucher = await assignVoucher(nullifier, validCode.collection)
  if (!voucher) {
    return res.status(503).json({ error: 'No vouchers available. Please try again later.' })
  }

  await claimDiscountCode(discountCode, nullifier, voucher.code)
  return res.status(200).json({ voucherCode: voucher.code })
}
