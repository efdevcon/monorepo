// Link shortcuts: GET lists the enabled ones (admin or read-only); POST adds,
// PATCH edits and DELETE removes one (admin). The list is data, not code, so
// the team maintains it from the admin page without a deploy.
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAdminAuth } from 'utils/adminAuth'
import { listLinks, createLink, updateLink, deleteLink, type LinkPatch } from 'services/qr-shares'
import { fail, handleError } from 'utils/qrShareApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (!checkAdminAuth(req, res, { allowReadonly: true })) return
    try {
      return res.status(200).json({ success: true, links: await listLinks() })
    } catch (e) {
      return handleError(res, e)
    }
  }
  if (req.method === 'POST') {
    if (!checkAdminAuth(req, res)) return
    const label = String(req.body?.label ?? '').trim()
    const url = String(req.body?.url ?? '').trim()
    const showOnRedeemPage = req.body?.showOnRedeemPage === true
    if (!label) return fail(res, 400, 'Label is required')
    if (!/^https?:\/\/\S+$/i.test(url)) return fail(res, 400, 'URL must start with http:// or https://')
    try {
      return res.status(200).json({ success: true, link: await createLink({ label, url, showOnRedeemPage }) })
    } catch (e) {
      return handleError(res, e)
    }
  }
  if (req.method === 'PATCH') {
    if (!checkAdminAuth(req, res)) return
    const id = Number(req.body?.id)
    if (!Number.isInteger(id)) return fail(res, 400, 'id is required')
    const patch: LinkPatch = {}
    if (req.body?.label !== undefined) {
      patch.label = String(req.body.label).trim()
      if (!patch.label) return fail(res, 400, 'Label is required')
    }
    if (req.body?.url !== undefined) {
      patch.url = String(req.body.url).trim()
      if (!/^https?:\/\/\S+$/i.test(patch.url)) return fail(res, 400, 'URL must start with http:// or https://')
    }
    if (req.body?.showOnRedeemPage !== undefined) patch.showOnRedeemPage = req.body.showOnRedeemPage === true
    if (req.body?.enabled !== undefined) patch.enabled = req.body.enabled === true
    try {
      await updateLink(id, patch)
      return res.status(200).json({ success: true })
    } catch (e) {
      return handleError(res, e)
    }
  }
  if (req.method === 'DELETE') {
    if (!checkAdminAuth(req, res)) return
    const id = Number(req.body?.id)
    if (!Number.isInteger(id)) return fail(res, 400, 'id is required')
    try {
      await deleteLink(id)
      return res.status(200).json({ success: true })
    } catch (e) {
      return handleError(res, e)
    }
  }
  return fail(res, 405, 'Method not allowed')
}
