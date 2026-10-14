// Admin: delete one share row for good (its token dies with it).
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { deleteShares } from 'services/qr-shares'
import { fail, handleError } from 'utils/qrShareApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (!checkAdminAuth(req, res)) return
  const id = Number(req.body?.id)
  if (!Number.isInteger(id)) return fail(res, 400, 'id is required')
  try {
    await deleteShares([id])
    return res.status(200).json({ success: true })
  } catch (e) {
    return handleError(res, e)
  }
}
