// Admin: every share of this environment, newest first, with Pretix's redeemed flag refreshed.
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { listShares } from 'services/qr-shares'
import { ENV, fail, handleError, refreshRedeemed, toPublic } from 'utils/qrShareApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed')
  if (!checkAdminAuth(req, res)) return
  try {
    const shares = await refreshRedeemed(await listShares(ENV))
    return res.status(200).json({ success: true, shares: shares.map(toPublic) })
  } catch (e) {
    return handleError(res, e)
  }
}
