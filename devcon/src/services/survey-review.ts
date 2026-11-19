import type { FormField } from 'services/nocodb-meta'
import { stripEncryptedPrefix } from 'config/encrypted-forms'
import {
  parseScaleTitle,
  stripGithubPrefix,
  stripMemoryPrefix,
  stripVoicePrefix,
  stripWalletPrefix,
} from 'config/form-field-markers'

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
  // Who answered: columns shown at the top of each response (and searchable in
  // the side panel) instead of as questions. Not used on the Overview.
  contactColumns?: { email?: string; wallet?: string; memory?: string }
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
  contactColumns: { email: 'Email', wallet: 'Wallet', memory: 'Memory' },
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

/**
 * A question title as respondents saw it: the form renderer's markers
 * ("[wallet]", "[memory]", "[encrypted]", "country:", …) are stripped, as
 * components/domain/nocodb-form/FormRenderer does. A scale's end labels
 * ("[scale: Too short | Too long]") stay, after the title, since the review
 * pages show every scale as stars and 2/5 means "too short" there, not "bad".
 */
export function cleanQuestionTitle(title: string): string {
  let t = title.trim()
  let scale = ''
  for (let i = 0; i < 4; i++) {
    const before = t
    const parsed = parseScaleTitle(t)
    if (parsed) {
      t = parsed.title
      const [low, high] = parsed.labels ?? []
      if (low && high) scale = ` (${low} → ${high})`
    }
    t = stripEncryptedPrefix(stripGithubPrefix(stripWalletPrefix(stripVoicePrefix(stripMemoryPrefix(t))))).trim()
    if (t.toLowerCase().startsWith('country:')) t = t.slice('country:'.length).trim()
    if (t === before) break
  }
  return t ? t + scale : title
}

function contactColumnNames(config: SurveyConfig): string[] {
  const c = config.contactColumns ?? {}
  return [c.email, c.wallet, c.memory].filter((x): x is string => !!x)
}

/**
 * The survey's questions for the review pages: readable titles, and without
 * the role and contact columns (those are shown separately).
 */
export function surveyQuestions(config: SurveyConfig, fields: FormField[]): FormField[] {
  const skip = new Set([config.roleColumn, ...contactColumnNames(config)].filter(Boolean))
  return fields.filter(f => !skip.has(f.column_name)).map(f => ({ ...f, title: cleanQuestionTitle(f.title) }))
}

export interface SurveyContact {
  email: string | null
  wallet: string | null
  memory: string | null
}

/** The respondent's contact columns (see contactColumns), blank values as null. */
export function contactOf(config: SurveyConfig, row: SurveyRow): SurveyContact {
  const c = config.contactColumns ?? {}
  const read = (col?: string) => {
    const v = col ? row[col] : null
    return v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim()
  }
  return { email: read(c.email), wallet: read(c.wallet), memory: read(c.memory) }
}
