import type { NextApiRequest, NextApiResponse } from 'next'
import { SiweMessage } from 'siwe'
import { getAddress } from 'viem'
import { signProof, verifyProof } from 'services/builder/proof'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' })
    return
  }
  try {
    const { message, signature, nonceToken } = req.body || {}
    if (!message || !signature || !nonceToken) {
      res.status(400).json({ success: false, error: 'Missing message, signature, or nonceToken' })
      return
    }
    if (verifyProof(nonceToken, 'wallet') !== 'nonce') {
      res.status(401).json({ success: false, error: 'Invalid or expired nonce' })
      return
    }
    const expectedNonce = String(nonceToken).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)

    // Bind the signature to our host (anti-phishing): a SIWE message solicited for
    // another domain won't verify. Prefer the canonical NEXTAUTH_URL host; fall back
    // to the request host.
    let expectedDomain: string | undefined
    try {
      expectedDomain = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).host : undefined
    } catch {
      expectedDomain = undefined
    }
    if (!expectedDomain && typeof req.headers.host === 'string') expectedDomain = req.headers.host

    const siwe = new SiweMessage(message)
    const result = await siwe.verify({ signature, nonce: expectedNonce, domain: expectedDomain })
    if (!result.success) {
      res.status(401).json({ success: false, error: 'Signature verification failed' })
      return
    }
    const address = getAddress(siwe.address) // EIP-55 checksum
    const proof = signProof('wallet', address)
    res.status(200).json({ success: true, address, proof })
  } catch (e: any) {
    res.status(400).json({ success: false, error: 'Verification error', details: e?.message })
  }
}
