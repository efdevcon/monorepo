// Admin: blank the device. Whatever share is active goes off the screen; its
// status and code are untouched (Close is the one that kills a code).
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { clearActiveShares } from 'services/qr-shares'
import { ENV, fail, handleError } from 'utils/qrShareApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (!checkAdminAuth(req, res)) return
  try {
    const cleared = await clearActiveShares(ENV)
    return res.status(200).json({ success: true, cleared })
  } catch (e) {
    return handleError(res, e)
  }
}
