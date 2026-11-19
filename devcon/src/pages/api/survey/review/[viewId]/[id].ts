import type { NextApiRequest, NextApiResponse } from 'next'
import { checkBuilderReviewAuth } from 'utils/adminAuth'
import { getRowById, updateRow, listRows, getTableFields, getAllTableColumns } from 'services/nocodb'
import { resolveFormView } from 'services/nocodb-meta'

type SurveyRow = Record<string, unknown>

interface SurveyConfig {
  // Column holding the respondent's role, shown in the header.
  roleColumn?: string
  // Question groups this respondent was shown. A group is the upper-case
  // prefix of a column name ("VOL Rating" is in group "VOL"); columns without
  // one (Email, Role, …) are always shown. Return null to show every group.
  visibleGroups?: (row: SurveyRow) => string[] | null
}

// Devcon 8 Feedback Survey: respondents pick a role and only see that role's
// section. Non-attendees could opt in to the attendee questions (OPTIN Venue),
// volunteer leads also got the LEAD section, and everyone got the closing (END)
// questions.
const DEVCON8_FEEDBACK: SurveyConfig = {
  roleColumn: 'Role',
  visibleGroups: row => {
    const role = String(row['Role'] ?? '').trim()
    const optedIn = row['OPTIN Venue'] === 'Yes'
    const groups: Record<string, string[]> = {
      Attendee: ['ATT'],
      'Volunteer / Volunteer Lead': ['VOL', ...(row['VOL Is Lead'] === 'Yes' ? ['LEAD'] : [])],
      Speaker: ['SPK'],
      MC: ['MC'],
      'Ecosystem / Community Org (incl. Student Groups)': ['ECO', 'ATT'],
      Supporter: ['SUP'],
      'Media / Press / Creator': ['MEDIA'],
      'Community Hubs': ['HUB'],
      'CLS Organizer': ['CLS'],
    }
    const own = groups[role]
    if (!own) return null // unknown role: show everything rather than hide answers
    const attendeeQuestions = own.includes('ATT') ? [] : ['OPTIN', ...(optedIn ? ['ATT'] : [])]
    return [...own, ...attendeeQuestions, 'END']
  },
}

// NocoDB form views that may be opened in the survey viewer, with each
// survey's display rules. This list is also what stops the reviewer password
// from reading arbitrary NocoDB tables: add a survey's form view id here to
// enable it.
const SURVEYS = new Map<string, SurveyConfig>([
  ['vwok5lvkv9uhyr6s', DEVCON8_FEEDBACK], // Devcon 8 Feedback Survey form view
])

/** The group a column belongs to: its upper-case first word, if it has one. */
function columnGroup(columnName: string): string | null {
  const first = columnName.split(' ')[0]
  return columnName.includes(' ') && /^[A-Z0-9]+$/.test(first) ? first : null
}

// Optional private reviewer column on the survey table. Notes are only
// offered when the table actually has it.
const NOTES_COLUMN = 'Admin Notes'

// NocoDB workspace in the "Open in NocoDB" deep link (same one the builder
// review page links into).
const NOCODB_WORKSPACE = 'wx5thjwz'

// Admin "survey review" endpoint, gated by BUILDER_REVIEW_PASSWORD (sent as
// x-admin-key), the same credential as the builder review page.
// GET  -> the response row, the form's questions in form order, and prev/next.
// POST -> { comment } saves the private Admin Notes column.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (!checkBuilderReviewAuth(req, res)) return

  const viewId = Array.isArray(req.query.viewId) ? req.query.viewId[0] : req.query.viewId
  const config = viewId ? SURVEYS.get(viewId) : undefined
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
    const groups = config.visibleGroups?.(record) ?? null
    const fields = groups
      ? allFields.filter(f => {
          const g = columnGroup(f.column_name)
          return g === null || groups.includes(g)
        })
      : allFields
    const visibleFields = fields.filter(f => f.column_name !== config.roleColumn)
    const role = config.roleColumn ? String(record[config.roleColumn] ?? '').trim() : ''

    let nav: { prevId: number | null; nextId: number | null; position: number; total: number } = {
      prevId: null,
      nextId: null,
      position: 0,
      total: 0,
    }
    try {
      const ids = (await listRows(viewId))
        .map(r => Number(r['Id']))
        .filter(Number.isFinite)
        .sort((a, b) => a - b)
      const idx = ids.indexOf(id)
      nav = {
        prevId: idx > 0 ? ids[idx - 1] : null,
        nextId: idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null,
        position: idx >= 0 ? idx + 1 : 0,
        total: ids.length,
      }
    } catch (err) {
      console.warn('[survey/review] nav lookup failed:', err)
    }

    res.status(200).json({
      success: true,
      survey: { title: meta.formHeading || meta.viewTitle, viewTitle: meta.viewTitle },
      nocodbUrl: `https://form.devcon.org/${NOCODB_WORKSPACE}/${meta.baseId}/${meta.tableId}?rowId=${id}`,
      record,
      fields: visibleFields,
      role,
      hasNotes,
      nav,
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
    res.status(200).json({ success: true, comment })
    return
  }

  res.setHeader('Allow', 'GET, POST')
  res.status(405).json({ success: false, error: 'Method not allowed' })
}
