// Admin: put the same voucher or links back on the device with a fresh token.
// The share it was pressed on is closed only if nobody scanned it; a scanned
// one keeps serving the buyer who holds it (activation takes it off the device).
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { listShares, createShare, activateShare, updateShare, newToken } from 'services/qr-shares'
import { ENV, fail, handleError, refreshRedeemed, toPublic } from 'utils/qrShareApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (!checkAdminAuth(req, res)) return
  const id = Number(req.body?.id)
  if (!Number.isInteger(id)) return fail(res, 400, 'id is required')
  try {
    const old = (await listShares(ENV)).find(s => s.id === id)
    if (!old) return fail(res, 404, 'Share not found')
    await refreshRedeemed([old])
    if (old.redeemed) return fail(res, 400, 'This voucher has already been redeemed')
    if (old.status === 'open') await updateShare(old.id, { status: 'closed', active: false })
    const share = await createShare({
      token: newToken(),
      kind: old.kind,
      voucherCode: old.voucherCode,
      targetUrl: old.targetUrl,
      links: old.links,
      title: old.title,
      description: old.description,
      price: old.price,
      priceEth: old.priceEth,
      priceFiat: old.priceFiat,
      env: ENV,
      maxUsages: old.maxUsages,
      redemptions: old.redemptions,
    })
    await activateShare(share.id, ENV)
    return res.status(200).json({ success: true, share: toPublic({ ...share, active: true }) })
  } catch (e) {
    return handleError(res, e)
  }
}
