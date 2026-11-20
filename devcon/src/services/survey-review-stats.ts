import type { FormField } from 'services/nocodb-meta'
import { type SurveyConfig, type SurveyRow, sawField, roleOf, surveyQuestions } from 'services/survey-review'
import { LOW_AVERAGE, normalizeSearchText } from 'services/survey-review-shared'

// Overview statistics for the survey review Overview page: averages, answer
// breakdowns, common words and the comments from the least satisfied
// respondents. Everything is computed from the rows on each request; nothing
// leaves the server and no AI service is involved.

export interface OptionCount {
  value: string
  count: number
}

export interface Term {
  term: string
  count: number // respondents who used it
}

export interface Comment {
  id: number
  text: string
  avgRating: number | null
}

interface BaseStat {
  column: string
  title: string
  uidt: string
  asked: number // respondents who were shown the question
  answered: number
}

export interface RatingStat extends BaseStat {
  kind: 'rating'
  max: number
  average: number | null
  distribution: OptionCount[] // max → 1
}

export interface ChoiceStat extends BaseStat {
  kind: 'choice'
  multi: boolean
  options: OptionCount[] // most common first
}

export interface NumberStat extends BaseStat {
  kind: 'number'
  average: number | null
}

export interface TextStat extends BaseStat {
  kind: 'text'
  terms: Term[]
  lowest: Comment[] // up to 3, from respondents averaging under LOW_AVERAGE stars
}

export type QuestionStat = RatingStat | ChoiceStat | NumberStat | TextStat

export interface SectionStats {
  title: string
  questions: QuestionStat[]
}

export interface OverviewStats {
  firstId: number | null // lowest response id, for the link back to the responses
  total: number // responses matching the role filter
  roleCounts: OptionCount[] // all responses, regardless of the filter
  averageRating: number | null // mean of each respondent's average star rating
  highlights: QuestionStat[]
  ratingsLowestFirst: RatingStat[]
  sections: SectionStats[]
}

const MIN_ANSWERS_FOR_RANKING = 3
const MAX_TERMS = 8
const MAX_COMMENTS = 3

// Common English words plus survey filler, left out of "common words".
const STOPWORDS = new Set(
  `a about above after again all also am an and any are as at be because been before being below between both but by
  can could did do does doing done down during each even ever every few for from further get got had has have having he
  her here hers him his how i if in into is it its itself just let like lot lots made make many may me more most much
  must my myself no nor not now of off on once one only or other our ours out over own per really same she should so
  some such than that the their theirs them then there these they thing things this those through to too under until
  up us very was way we well were what when where which while who whom why will with would yes yet you your yours
  devcon devcon8 event events maybe overall dont don't im i'm it's its think lot bit quite still etc
  see love though want need able felt feel us got going able`.split(/\s+/)
)

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

function valuesOf(field: FormField, v: unknown): string[] {
  if (field.uidt === 'Checkbox') return [v ? 'Yes' : 'No']
  if (field.uidt === 'MultiSelect') {
    const items = Array.isArray(v) ? v : String(v ?? '').split(',')
    return items.map(x => String(x).trim()).filter(Boolean)
  }
  return [String(v)]
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/**
 * Each respondent's average star rating (0–5 scale) across the star questions
 * they were shown and answered (same rule as the side panel's average).
 */
export function respondentAverage(config: SurveyConfig, row: SurveyRow, fields: FormField[]): number | null {
  const scores = fields
    .filter(f => f.uidt === 'Rating' && sawField(config, row, f) && Number(row[f.column_name]) > 0)
    .map(f => (Number(row[f.column_name]) / (f.rating?.max ?? 5)) * 5)
  return mean(scores)
}

/**
 * The words of an answer exactly as the answer search sees them
 * (normalizeSearchText), with null in place of words that don't count
 * (stopwords, short words, contractions, numbers). Keeping the gaps means a
 * phrase is only ever two words next to each other, so a word link on the
 * Overview always finds the answers it was counted in.
 */
function tokens(text: string): (string | null)[] {
  return normalizeSearchText(text)
    .split(' ')
    .map(t => (t.length > 2 && !STOPWORDS.has(t) && !t.includes("'") && !/^\d+$/.test(t) ? t : null))
}

/**
 * Words and two-word phrases that several respondents used, counted once per
 * respondent. A word needs 2 respondents, a phrase 3; phrases are preferred
 * over their individual words.
 */
export function commonTerms(texts: string[], limit = MAX_TERMS): Term[] {
  const words = new Map<string, number>()
  const pairs = new Map<string, number>()
  for (const text of texts) {
    const toks = tokens(text)
    new Set(toks.filter((t): t is string => t !== null)).forEach(t => words.set(t, (words.get(t) || 0) + 1))
    const seen = new Set<string>()
    for (let i = 0; i < toks.length - 1; i++) {
      const [a, b] = [toks[i], toks[i + 1]]
      if (a === null || b === null || a === b) continue
      seen.add(`${a} ${b}`)
    }
    seen.forEach(p => pairs.set(p, (pairs.get(p) || 0) + 1))
  }
  const picked: Term[] = [...pairs.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.ceil(limit / 2))
    .map(([term, count]) => ({ term, count }))
  const covered = new Set(picked.flatMap(p => p.term.split(' ')))
  for (const [term, count] of [...words.entries()].sort((a, b) => b[1] - a[1])) {
    if (picked.length >= limit) break
    if (count < 2 || covered.has(term)) continue
    picked.push({ term, count })
  }
  return picked.sort((a, b) => b.count - a.count)
}

function questionStat(
  field: FormField,
  pool: { row: SurveyRow; avg: number | null }[],
  config: SurveyConfig
): QuestionStat | null {
  const asked = pool.filter(p => sawField(config, p.row, field))
  const base = { column: field.column_name, title: field.title, uidt: field.uidt, asked: asked.length }

  if (field.uidt === 'Rating') {
    const max = field.rating?.max ?? 5
    const scores = asked.map(p => Number(p.row[field.column_name])).filter(n => n > 0)
    const distribution: OptionCount[] = []
    for (let v = max; v >= 1; v--) distribution.push({ value: String(v), count: scores.filter(s => s === v).length })
    return { ...base, kind: 'rating', max, answered: scores.length, average: mean(scores), distribution }
  }

  if (['SingleSelect', 'MultiSelect', 'Checkbox'].includes(field.uidt)) {
    const answered = asked.filter(p => field.uidt === 'Checkbox' || !isBlank(p.row[field.column_name]))
    const counts = new Map<string, number>()
    answered.forEach(p =>
      valuesOf(field, p.row[field.column_name]).forEach(v => counts.set(v, (counts.get(v) || 0) + 1))
    )
    const options = [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count)
    return { ...base, kind: 'choice', multi: field.uidt === 'MultiSelect', answered: answered.length, options }
  }

  if (['Number', 'Decimal'].includes(field.uidt)) {
    // Blank means unanswered; 0 is a real answer here (unlike star ratings).
    const nums = asked
      .filter(p => !isBlank(p.row[field.column_name]))
      .map(p => Number(p.row[field.column_name]))
      .filter(n => Number.isFinite(n))
    return { ...base, kind: 'number', answered: nums.length, average: mean(nums) }
  }

  if (['LongText', 'SingleLineText'].includes(field.uidt)) {
    const answered = asked
      .map(p => ({ ...p, text: String(p.row[field.column_name] ?? '').trim() }))
      .filter(p => p.text.length > 0)
    const lowest = answered
      .filter(p => p.text.length > 15 && p.avg !== null && p.avg < LOW_AVERAGE)
      .sort((a, b) => (a.avg ?? 9) - (b.avg ?? 9) || Number(a.row['Id']) - Number(b.row['Id']))
      .slice(0, MAX_COMMENTS)
      .map(p => ({
        id: Number(p.row['Id']),
        avgRating: p.avg,
        text: p.text.length > 320 ? `${p.text.slice(0, 317)}…` : p.text,
      }))
    return {
      ...base,
      kind: 'text',
      answered: answered.length,
      terms: commonTerms(answered.map(p => p.text)),
      lowest: field.uidt === 'LongText' ? lowest : [],
    }
  }

  return null // emails, URLs, attachments and other identifying or unsupported types are left out
}

/** Section headings from the form: the first line of a field's `section` block. */
function sectionTitle(md: string): string {
  return (md.trim().split('\n')[0] || '').replace(/^#+\s*/, '').trim()
}

export function buildOverview(
  config: SurveyConfig,
  fields: FormField[],
  rows: SurveyRow[],
  roleFilter: string | null
): OverviewStats {
  const counts = new Map<string, number>()
  rows.forEach(r => {
    const role = roleOf(config, r)
    counts.set(role, (counts.get(role) || 0) + 1)
  })
  const roleCounts = [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count)

  // Contact columns (email, wallet, memory) are never part of the stats.
  const questions = surveyQuestions(config, fields)
  const pool = rows
    .filter(r => roleFilter === null || roleOf(config, r) === roleFilter) // '' = no role
    .map(row => ({ row, avg: respondentAverage(config, row, questions) }))

  const stats = new Map<string, QuestionStat>()
  const sections: SectionStats[] = []
  for (const f of questions) {
    if (f.section || sections.length === 0) {
      sections.push({ title: (f.section && sectionTitle(f.section)) || 'Questions', questions: [] })
    }
    const stat = questionStat(f, pool, config)
    if (!stat) continue
    stats.set(f.column_name, stat)
    if (stat.asked > 0) sections[sections.length - 1].questions.push(stat)
  }

  const ids = rows.map(r => Number(r['Id'])).filter(Number.isFinite)
  return {
    firstId: ids.length ? Math.min(...ids) : null,
    total: pool.length,
    roleCounts,
    averageRating: mean(pool.map(p => p.avg).filter((a): a is number => a !== null)),
    highlights: (config.highlights ?? [])
      .map(c => stats.get(c))
      .filter((s): s is QuestionStat => !!s && s.answered > 0),
    ratingsLowestFirst: [...stats.values()]
      .filter((s): s is RatingStat => s.kind === 'rating' && s.answered >= MIN_ANSWERS_FOR_RANKING)
      .sort((a, b) => (a.average ?? 0) / a.max - (b.average ?? 0) / b.max),
    sections: sections.filter(s => s.questions.length > 0),
  }
}
