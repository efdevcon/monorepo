/**
 * GET /api/x402/admin/screen-address?address=0x...
 *
 * OFAC + scam-list screening for an EVM address (see services/address-screen).
 * Called by the admin refund modal before any refund tx is signed: an OFAC
 * hit must hard-stop the refund (refunding a sanctioned address is itself a
 * violation — freeze and escalate), a scam-list hit requires an explicit
 * admin confirmation.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { screenAddress } from 'services/address-screen'
import { checkAdminAuth } from 'utils/adminAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  if (!checkAdminAuth(req, res)) return

  const address = Array.isArray(req.query.address) ? req.query.address[0] : req.query.address
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ success: false, error: 'address must be a 0x-prefixed 40-hex address' })
  }

  try {
    const result = await screenAddress(address)
    return res.status(200).json({ success: true, ...result })
  } catch (error) {
    return res.status(500).json({ success: false, error: `screening failed: ${(error as Error).message}` })
  }
}
