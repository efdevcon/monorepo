// Admin: bring a closed share back. Its status returns to what it was
// (scanned if a buyer had opened it, open otherwise); it is not put back on
// the device, that is what "show again" does.
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { listShares, updateShare } from 'services/qr-shares'
import { ENV, fail, handleError, toPublic } from 'utils/qrShareApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (!checkAdminAuth(req, res)) return
  const id = Number(req.body?.id)
  if (!Number.isInteger(id)) return fail(res, 400, 'id is required')
  try {
    const share = (await listShares(ENV)).find(s => s.id === id)
    if (!share) return fail(res, 404, 'Share not found')
    if (share.status !== 'closed') return fail(res, 400, 'This share is not closed')
    const status = share.scannedAt ? 'scanned' : 'open'
    await updateShare(id, { status })
    return res.status(200).json({ success: true, share: toPublic({ ...share, status }) })
  } catch (e) {
    return handleError(res, e)
  }
}
