// QR sharing page (admin or read-only): the share to display right now, or null.
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { getActiveShare } from 'services/qr-shares'
import { ENV, fail, handleError, refreshRedeemed, toDevice } from 'utils/qrShareApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed')
  if (!checkAdminAuth(req, res, { allowReadonly: true })) return
  try {
    const share = await getActiveShare(ENV)
    if (!share) return res.status(200).json({ success: true, share: null })
    await refreshRedeemed([share])
    return res.status(200).json({ success: true, share: toDevice(share) })
  } catch (e) {
    return handleError(res, e)
  }
}
