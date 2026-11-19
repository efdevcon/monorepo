import type { NextApiRequest, NextApiResponse } from 'next'
import { checkBuilderReviewAuth } from 'utils/adminAuth'
import { listRows, getTableFields } from 'services/nocodb'
import { resolveFormView } from 'services/nocodb-meta'
import { getSurveyConfig } from 'services/survey-review'
import { buildOverview } from 'services/survey-review-stats'

// Admin "survey review" endpoint for the Overview page, gated by
// BUILDER_REVIEW_PASSWORD (sent as x-admin-key) like the endpoints next to it.
// GET ?role=<role> -> headline numbers, average ratings (lowest first), answer
// breakdowns, and for written questions the common words and the comments of
// the least satisfied respondents. Computed live from NocoDB on each request.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (!checkBuilderReviewAuth(req, res)) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ success: false, error: 'Method not allowed' })
    return
  }

  const viewId = Array.isArray(req.query.viewId) ? req.query.viewId[0] : req.query.viewId
  const config = getSurveyConfig(viewId)
  if (!viewId || !config) {
    res.status(404).json({ success: false, error: 'Unknown survey' })
    return
  }
  const role = Array.isArray(req.query.role) ? req.query.role[0] : req.query.role

  const [fields, rows, meta] = await Promise.all([getTableFields(viewId), listRows(viewId), resolveFormView(viewId)])

  res.status(200).json({
    success: true,
    survey: { title: meta.formHeading || meta.viewTitle },
    overview: buildOverview(config, fields, rows, role || null),
  })
}
