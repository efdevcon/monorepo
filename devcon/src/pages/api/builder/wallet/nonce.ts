import type { NextApiRequest, NextApiResponse } from 'next'
import { signProof } from 'services/builder/proof'

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  // The nonce is itself a short-lived signed token; verify.ts checks it was issued by us.
  const nonceToken = signProof('wallet', 'nonce', 600)
  // SIWE nonce must be alphanumeric; expose a hash the client puts in the message,
  // and return the token so the client echoes it back for verification.
  res.status(200).json({ success: true, nonceToken, nonce: nonceToken.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32) })
}
