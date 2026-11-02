// Admin only: the read-only password the device logs in with, so the admin
// page can remind whoever sets up the screen. The read-only key itself gets a
// 403 here like on every other admin route. Never cached.
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { fail } from 'utils/qrShareApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed')
  if (!checkAdminAuth(req, res)) return
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ success: true, key: process.env.TICKETS_READONLY_PASSWORD || null })
}
