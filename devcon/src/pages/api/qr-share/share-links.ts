// Admin: put links on the device, no voucher: saved shortcuts by id and/or
// one-off URLs pasted into the share box (labelled from their address).
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { createShare, activateShare, newToken, listLinks, titleForLinks, type QrLink } from 'services/qr-shares'
import { ENV, fail, handleError, toPublic } from 'utils/qrShareApi'

/** A readable label for a pasted URL: host plus path, trimmed. */
function labelFor(url: string): string {
  try {
    const u = new URL(url)
    const path = decodeURIComponent(u.pathname).replace(/\/+$/, '')
    const label = `${u.hostname.replace(/^www\./, '')}${path}`
    return label.length > 60 ? `${label.slice(0, 57)}…` : label
  } catch {
    return url
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed')
  if (!checkAdminAuth(req, res)) return
  const ids: unknown = req.body?.linkIds ?? []
  const urls: unknown = req.body?.urls ?? []
  if (!Array.isArray(ids) || !ids.every(n => Number.isInteger(n))) return fail(res, 400, 'linkIds must be a list of ids')
  if (!Array.isArray(urls) || !urls.every(u => typeof u === 'string')) return fail(res, 400, 'urls must be a list of strings')
  const pasted = (urls as string[]).map(u => u.trim()).filter(Boolean)
  const bad = pasted.find(u => !/^https?:\/\/\S+$/i.test(u))
  if (bad) return fail(res, 400, 'Links must start with http:// or https://')
  if (!ids.length && !pasted.length) return fail(res, 400, 'Pick or paste at least one link')
  try {
    const all = ids.length ? await listLinks() : []
    const picked = (ids as number[]).map(id => all.find(l => l.id === id)).filter((l): l is QrLink => !!l)
    const links = [...pasted.map(url => ({ label: labelFor(url), url })), ...picked.map(l => ({ label: l.label, url: l.url }))]
    if (!links.length) return fail(res, 400, 'None of those links exist or are enabled')
    const share = await createShare({
      token: newToken(),
      kind: 'links',
      voucherCode: null,
      targetUrl: null,
      links,
      title: titleForLinks(links),
      description: null,
      price: null,
      priceEth: null,
      priceFiat: null,
      env: ENV,
      maxUsages: 0,
      redemptions: 0,
    })
    await activateShare(share.id, ENV)
    return res.status(200).json({ success: true, share: toPublic({ ...share, active: true }) })
  } catch (e) {
    return handleError(res, e)
  }
}
