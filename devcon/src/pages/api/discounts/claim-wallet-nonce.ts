import type { NextApiRequest, NextApiResponse } from 'next'
import { signProof } from 'services/builder/proof'

/**
 * Issue a short-lived, server-signed nonce for the wallet discount claim
 * (claim-wallet). Mirrors builder/wallet/nonce.ts: the client puts `nonce` in
 * the SIWE message and echoes `nonceToken` back so claim-wallet can verify the
 * nonce was issued by us. Binding the SIWE signature to a server nonce (and our
 * domain) is what closes the M25/M26 replay: a signature harvested from any
 * other site/time/chain no longer validates here.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const nonceToken = signProof('wallet', 'nonce', 600) // 10-minute TTL
  res.status(200).json({
    success: true,
    nonceToken,
    // SIWE nonce must be alphanumeric.
    nonce: nonceToken.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32),
  })
}
