import type { NextApiRequest, NextApiResponse } from 'next'
import { checkBuilderReviewAuth } from 'utils/adminAuth'
import { getTableFields } from 'services/nocodb'
import {
  getSurveyConfig,
  visibleFieldsFor,
  roleOf,
  contactOf,
  surveyQuestions,
  NOTES_COLUMN,
} from 'services/survey-review'
import { getSurveyRows, surveyHandler } from 'services/survey-review-rows'
import { normalizeSearchText } from 'services/survey-review-shared'

// Admin "survey review" endpoint listing every response for the side panel,
// gated by BUILDER_REVIEW_PASSWORD (sent as x-admin-key) like the endpoints
// next to it.
// GET -> one summary per response: role, average star rating, a snippet of
// the first written answer, and the text of every answer the respondent was
// shown plus their email (for the word search). Only questions on the form
// and the contact email are included.
async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  const [allFields, rows] = await Promise.all([getTableFields(viewId), getSurveyRows(viewId, { fresh: true })])
  const fields = surveyQuestions(config, allFields)

  const responses = rows
    .map(row => {
      const id = Number(row['Id'])
      const visible = visibleFieldsFor(config, row, fields)
      const ratings: number[] = []
      const texts: string[] = []
      let snippet = ''
      let hasWritten = false
      for (const f of visible) {
        const v = row[f.column_name]
        if (v === null || v === undefined || v === '') continue
        if (f.uidt === 'Rating') {
          const n = Number(v)
          if (n > 0) ratings.push(n / (f.rating?.max ?? 5))
          continue
        }
        if (f.uidt === 'Checkbox') continue // true/false isn't searchable text
        const text = Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? '' : String(v)
        if (!text) continue
        texts.push(text)
        if (f.uidt === 'LongText' && text.trim().length > 25) hasWritten = true
        if (!snippet && f.uidt === 'LongText' && text.trim().length > 3) snippet = text.trim()
      }
      const { email } = contactOf(config, row)
      if (email) texts.push(email) // so a reviewer can find someone by email
      return {
        id,
        email,
        role: roleOf(config, row),
        avgRating: ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 5 : null,
        snippet: snippet.slice(0, 140),
        hasWritten,
        hasNote: String(row[NOTES_COLUMN] ?? '').trim() !== '',
        text: texts.map(normalizeSearchText).join('\n'), // matched by the side panel search
      }
    })
    .filter(r => Number.isFinite(r.id))
    .sort((a, b) => a.id - b.id)

  res.status(200).json({ success: true, responses })
}

export default surveyHandler(handler)
