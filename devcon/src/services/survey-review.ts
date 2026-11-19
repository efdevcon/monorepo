import type { FormField } from 'services/nocodb-meta'

// Survey review: which NocoDB survey forms may be opened in the reviewer pages
// (pages/survey-review/*), and which questions each respondent was shown.

export type SurveyRow = Record<string, unknown>

// Optional private reviewer column on a survey table. Notes are only offered
// when the table actually has it.
export const NOTES_COLUMN = 'Admin Notes'

export interface SurveyConfig {
  // Column holding the respondent's role, shown in the header.
  roleColumn?: string
  // Column-name prefixes that mark a question group ("VOL Rating" is in group
  // "VOL"). Only these count as groups, so an ordinary question that happens
  // to start with a capitalised word ("OK to contact you?") is never hidden.
  groupPrefixes?: string[]
  // Question groups this respondent was shown. Columns outside every group
  // (Email, Role, …) are always shown. Return null to show every group.
  visibleGroups?: (row: SurveyRow) => string[] | null
  // Questions shown as headline cards on the Overview page (column names).
  // Missing columns are skipped.
  highlights?: string[]
}

// Devcon 8 Feedback Survey: respondents pick a role and only see that role's
// section. Non-attendees could opt in to the attendee questions (OPTIN Venue),
// volunteer leads also got the LEAD section, and everyone got the closing (END)
// questions.
const DEVCON8_FEEDBACK: SurveyConfig = {
  roleColumn: 'Role',
  groupPrefixes: ['ATT', 'VOL', 'LEAD', 'SPK', 'MC', 'ECO', 'SUP', 'MEDIA', 'HUB', 'CLS', 'OPTIN', 'END'],
  // Overall rating (attendees), would-recommend and would-attend-again.
  highlights: ['ATT General', 'END Nps', 'END Attend'],
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

export function getSurveyConfig(viewId: string | undefined): SurveyConfig | undefined {
  return viewId ? SURVEYS.get(viewId) : undefined
}

/** The group a column belongs to: its first word, if that is one of the survey's group prefixes. */
export function columnGroup(config: SurveyConfig, columnName: string): string | null {
  const first = columnName.split(' ')[0]
  return columnName.includes(' ') && (config.groupPrefixes ?? []).includes(first) ? first : null
}

/** Whether this respondent was shown the given question. */
export function sawField(config: SurveyConfig, row: SurveyRow, field: FormField): boolean {
  const groups = config.visibleGroups?.(row) ?? null
  if (!groups) return true
  const g = columnGroup(config, field.column_name)
  return g === null || groups.includes(g)
}

/** The questions this respondent was shown, in form order, without the role question itself. */
export function visibleFieldsFor(config: SurveyConfig, row: SurveyRow, fields: FormField[]): FormField[] {
  return fields.filter(f => f.column_name !== config.roleColumn && sawField(config, row, f))
}

export function roleOf(config: SurveyConfig, row: SurveyRow): string {
  return config.roleColumn ? String(row[config.roleColumn] ?? '').trim() : ''
}
