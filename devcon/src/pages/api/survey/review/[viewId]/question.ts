import type { NextApiRequest, NextApiResponse } from 'next'
import { checkBuilderReviewAuth } from 'utils/adminAuth'
import { getTableFields } from 'services/nocodb'
import { getConditionalRules, resolveFormView } from 'services/nocodb-meta'
import {
  followUpsFor,
  getSurveyConfig,
  sawField,
  roleOf,
  surveyQuestions,
  withoutMintOnly,
} from 'services/survey-review'
import { getSurveyRows, surveyHandler } from 'services/survey-review-rows'

// Admin "survey review" endpoint for one question across every response,
// gated by BUILDER_REVIEW_PASSWORD (sent as x-admin-key) like the per-response
// endpoint next to it.
// GET ?column=<column name> -> the question, the form's question list (for
// the picker), and one entry per respondent who was shown the question, with
// what they wrote in the question's written follow-ups ("Why?"), if any.
// Respondents who were never shown it (other roles) are left out.
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
  const column = Array.isArray(req.query.column) ? req.query.column[0] : req.query.column

  const [fields, meta, rules] = await Promise.all([
    getTableFields(viewId),
    resolveFormView(viewId),
    getConditionalRules(viewId),
  ])
  // Only questions that are on the form can be read here (not hidden columns).
  const questions = surveyQuestions(config, fields)
  const field = questions.find(f => f.column_name === column)
  if (!field) {
    res.status(404).json({ success: false, error: 'Unknown question' })
    return
  }

  const followUps = followUpsFor(field, questions, rules)
  const { rows, hidden } = withoutMintOnly(config, fields, await getSurveyRows(viewId))
  const answers = rows
    .filter(row => sawField(config, row, field))
    .map(row => ({
      id: Number(row['Id']),
      role: roleOf(config, row),
      value: row[field.column_name] ?? null,
      followUps: followUps
        .filter(f => sawField(config, row, f))
        .map(f => ({ column: f.column_name, text: writtenText(row[f.column_name]) }))
        .filter(t => t.text !== ''),
    }))
    .filter(a => Number.isFinite(a.id))
    .sort((a, b) => a.id - b.id)

  res.status(200).json({
    success: true,
    survey: { title: meta.formHeading || meta.viewTitle },
    field,
    questions,
    followUps: followUps.map(f => ({ column: f.column_name, title: f.title })),
    answers,
    // Roles of the hidden mint-only submissions that were asked this question.
    mintOnlyRoles: hidden.filter(row => sawField(config, row, field)).map(row => roleOf(config, row)),
  })
}

function writtenText(v: unknown): string {
  if (v === null || v === undefined || typeof v === 'object') return Array.isArray(v) ? v.join(', ').trim() : ''
  return String(v).trim()
}

export default surveyHandler(handler)
