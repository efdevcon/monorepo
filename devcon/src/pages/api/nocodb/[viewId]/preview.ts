import type { NextApiRequest, NextApiResponse } from 'next'
import { isPreviewAllowed } from 'services/form-config'

/**
 * POST { password } -> 200 when it matches the form's "Preview Password" in the
 * Form config table. FormPage calls this for a closed form opened with
 * `?preview=<password>` and renders the form instead of the closed notice; the
 * submit route checks the same password, so the preview can be submitted.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }
  const { viewId } = req.query
  if (typeof viewId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid viewId' })
  }
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (await isPreviewAllowed(viewId, req.body?.password)) {
      return res.status(200).json({ success: true })
    }
    return res.status(403).json({ success: false, error: 'Invalid preview link' })
  } catch (err) {
    console.error('[nocodb/preview] error:', err)
    return res.status(500).json({ success: false, error: 'Could not check the preview link' })
  }
}
