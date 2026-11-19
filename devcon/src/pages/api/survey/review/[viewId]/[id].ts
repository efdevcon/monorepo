import type { NextApiRequest, NextApiResponse } from 'next'
import { checkBuilderReviewAuth } from 'utils/adminAuth'
import { getRowById, updateRow, getTableFields, getAllTableColumns } from 'services/nocodb'
import { resolveFormView } from 'services/nocodb-meta'
import { getAddress, isAddress } from 'viem'
import {
  getSurveyConfig,
  visibleFieldsFor,
  roleOf,
  contactOf,
  surveyQuestions,
  NOTES_COLUMN,
} from 'services/survey-review'
import { invalidateSurveyRows, surveyHandler } from 'services/survey-review-rows'

// NocoDB workspace in the "Open in NocoDB" deep link (same one the builder
// review page links into).
const NOCODB_WORKSPACE = 'wx5thjwz'

// Admin "survey review" endpoint, gated by BUILDER_REVIEW_PASSWORD (sent as
// x-admin-key), the same credential as the builder review page.
// GET  -> the response row and the questions this respondent was shown, in form
//         order. Prev/next comes from the side panel's list (GET /api/survey/review/[viewId]).
// POST -> { comment } saves the private Admin Notes column.
async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (!checkBuilderReviewAuth(req, res)) return

  const viewId = Array.isArray(req.query.viewId) ? req.query.viewId[0] : req.query.viewId
  const config = getSurveyConfig(viewId)
  if (!viewId || !config) {
    res.status(404).json({ success: false, error: 'Unknown survey' })
    return
  }
  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const id = Number(rawId)
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ success: false, error: 'Invalid id' })
    return
  }

  if (req.method === 'GET') {
    const record = await getRowById(viewId, id)
    if (!record) {
      res.status(404).json({ success: false, error: 'Survey response not found' })
      return
    }

    const [allFields, columns, meta] = await Promise.all([
      getTableFields(viewId),
      getAllTableColumns(viewId),
      resolveFormView(viewId),
    ])
    const hasNotes = columns.some(c => c.title === NOTES_COLUMN)

    // Only the questions this respondent was actually shown.
    const visibleFields = visibleFieldsFor(config, record, surveyQuestions(config, allFields))
    const role = roleOf(config, record)
    // Who answered (this page is behind the reviewer password). Wallets are
    // shown in EIP-55 form. Anything else (not an address, or mixed case with a
    // wrong checksum, i.e. probably a typo) is shown exactly as entered.
    const contact = contactOf(config, record)
    if (contact.wallet && isAddress(contact.wallet, { strict: true })) contact.wallet = getAddress(contact.wallet)
    // Send only what the page shows: the shown questions, contact details, id,
    // date and note, never other columns of the table (internal flags).
    const keep = ['Id', 'CreatedAt', 'created_at', NOTES_COLUMN, ...visibleFields.map(f => f.column_name)]
    const shownRecord = Object.fromEntries(keep.filter(k => k in record).map(k => [k, record[k]]))

    res.status(200).json({
      success: true,
      survey: { title: meta.formHeading || meta.viewTitle, viewTitle: meta.viewTitle },
      nocodbUrl: `https://form.devcon.org/${NOCODB_WORKSPACE}/${meta.baseId}/${meta.tableId}?rowId=${id}`,
      record: shownRecord,
      fields: visibleFields,
      role,
      contact,
      hasNotes,
    })
    return
  }

  if (req.method === 'POST') {
    const comment = req.body?.comment
    if (typeof comment !== 'string') {
      res.status(400).json({ success: false, error: 'comment must be a string' })
      return
    }
    const columns = await getAllTableColumns(viewId)
    if (!columns.some(c => c.title === NOTES_COLUMN)) {
      res.status(400).json({ success: false, error: `This survey table has no "${NOTES_COLUMN}" column` })
      return
    }
    const record = await getRowById(viewId, id)
    if (!record) {
      res.status(404).json({ success: false, error: 'Survey response not found' })
      return
    }
    await updateRow(viewId, id, { [NOTES_COLUMN]: comment })
    invalidateSurveyRows(viewId) // the side panel's note dots read the cached rows
    res.status(200).json({ success: true, comment })
    return
  }

  res.setHeader('Allow', 'GET, POST')
  res.status(405).json({ success: false, error: 'Method not allowed' })
}

export default surveyHandler(handler)
