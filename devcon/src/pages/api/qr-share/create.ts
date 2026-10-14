// Admin: paste a redeem URL, get it on the QR sharing page,
// optionally with saved links that then show under the redeem button.
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { createShare, activateShare, newToken, parseVoucherInput, listLinks, type QrLink } from 'services/qr-shares'
import { describeVoucher } from 'services/qr-share-voucher'
import { ENV, fail, handleError, toPublic } from 'utils/qrShareApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (!checkAdminAuth(req, res)) return
  const code = parseVoucherInput(String(req.body?.input ?? ''))
  if (!code) return fail(res, 400, 'Paste a redeem URL')
  const ids: unknown = req.body?.linkIds ?? []
  if (!Array.isArray(ids) || !ids.every(n => Number.isInteger(n))) return fail(res, 400, 'linkIds must be a list of ids')
  try {
    const all = ids.length ? await listLinks() : []
    const links = (ids as number[])
      .map(id => all.find(l => l.id === id))
      .filter((l): l is QrLink => !!l)
      .map(l => ({ label: l.label, url: l.url }))
    const described = await describeVoucher(code)
    if (!described.ok) return fail(res, 400, described.error)
    if (described.voucher.redeemed) return fail(res, 400, 'This voucher is used up')
    const v = described.voucher
    const share = await createShare({
      token: newToken(),
      kind: 'voucher',
      voucherCode: v.code,
      targetUrl: v.targetUrl,
      links,
      title: v.title,
      description: v.description,
      price: v.price,
      priceEth: v.priceEth,
      priceFiat: v.priceFiat,
      env: ENV,
      maxUsages: v.maxUsages,
      redemptions: v.redemptions,
    })
    await activateShare(share.id, ENV)
    return res.status(200).json({ success: true, share: toPublic({ ...share, active: true }) })
  } catch (e) {
    return handleError(res, e)
  }
}
