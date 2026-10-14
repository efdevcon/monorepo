// Admin: empty the shares table for this environment. Saved links are untouched.
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { deleteAllShares } from 'services/qr-shares'
import { ENV, fail, handleError } from 'utils/qrShareApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (!checkAdminAuth(req, res)) return
  try {
    const deleted = await deleteAllShares(ENV)
    return res.status(200).json({ success: true, deleted })
  } catch (e) {
    return handleError(res, e)
  }
}
