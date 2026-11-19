import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import Page from 'components/common/layouts/page'
import type { FormField } from 'services/nocodb-meta'
import { ChevronLeft, Loader2 } from 'lucide-react'
import {
  CARD,
  PAGE_BG,
  SurveyTheme,
  AnswerValue,
  SurveyPasswordGate,
  isUnanswered,
  parseSection,
} from 'components/domain/survey-review'
import { roleLabel } from 'components/domain/survey-review/ResponseList'
import {
  readStoredPassword,
  storePassword,
  clearStoredPassword,
  BUILDER_REVIEW_PASSWORD_KEY,
} from 'utils/adminPassword'

// Everyone's answer to one survey question: a breakdown for ratings and
// choices (click a bar to filter), then each answer with a link to the full
// response. Opened from the "All answers" link beside a question on
// pages/survey-review/[viewId]/[id].tsx. Gated by the builder review password.

interface Answer {
  id: number
  role: string
  value: unknown
}

const CHOICE_TYPES = new Set(['Rating', 'SingleSelect', 'MultiSelect', 'Checkbox', 'Number'])

/** The value(s) an answer counts toward in the breakdown. */
function valuesOf(field: FormField, value: unknown): string[] {
  if (field.uidt === 'Checkbox') return [value ? 'Yes' : 'No']
  if (field.uidt === 'MultiSelect') {
    const items = Array.isArray(value) ? value : String(value ?? '').split(',')
    return items.map(v => String(v).trim()).filter(Boolean)
  }
  return [String(value)]
}

export default function SurveyQuestionPage() {
  const router = useRouter()
  const viewId = typeof router.query.viewId === 'string' ? router.query.viewId : undefined
  const column = typeof router.query.column === 'string' ? router.query.column : undefined
  const from = typeof router.query.from === 'string' ? router.query.from : undefined

  const [secret, setSecret] = useState<string | null>(null)
  const [field, setField] = useState<FormField | null>(null)
  const [questions, setQuestions] = useState<FormField[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [surveyTitle, setSurveyTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState('all')
  const [picked, setPicked] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const base = viewId ? `/en/survey-review/${viewId}` : ''

  useEffect(() => {
    const s = readStoredPassword(BUILDER_REVIEW_PASSWORD_KEY)
    if (s) setSecret(s)
  }, [])

  const load = useCallback(
    async (key: string) => {
      if (!viewId || !column) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/survey/review/${viewId}/question?column=${encodeURIComponent(column)}`, {
          headers: { 'x-admin-key': key },
          cache: 'no-store',
        })
        if (res.status === 401) {
          clearStoredPassword(BUILDER_REVIEW_PASSWORD_KEY)
          setSecret(null)
          setError('Invalid password.')
          return
        }
        const json = await res.json()
        if (!res.ok || !json.success) {
          setError(json.error || `Failed to load (${res.status})`)
          return
        }
        setField(json.field)
        setQuestions(Array.isArray(json.questions) ? json.questions : [])
        setAnswers(Array.isArray(json.answers) ? json.answers : [])
        setSurveyTitle(json.survey?.title ?? '')
        setPicked(null)
        setSearch('')
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [viewId, column]
  )

  useEffect(() => {
    if (secret && viewId && column) load(secret)
  }, [secret, viewId, column, load])

  // Section heading for each question, for the picker's groups.
  const pickerGroups = useMemo(() => {
    const groups: { title: string; fields: FormField[] }[] = []
    for (const f of questions) {
      if (f.section || groups.length === 0) {
        groups.push({ title: f.section ? parseSection(f.section).title || 'Questions' : 'Questions', fields: [] })
      }
      groups[groups.length - 1].fields.push(f)
    }
    return groups
  }, [questions])

  const roles = useMemo(() => {
    const counts = new Map<string, number>()
    answers.forEach(a => counts.set(a.role, (counts.get(a.role) || 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [answers])

  if (!secret) {
    return (
      <SurveyPasswordGate
        error={error}
        onUnlock={k => {
          storePassword(BUILDER_REVIEW_PASSWORD_KEY, k)
          setSecret(k)
        }}
      />
    )
  }

  const pool = answers.filter(a => role === 'all' || a.role === role)
  const answered = field ? pool.filter(a => field.uidt === 'Checkbox' || !isUnanswered(field, a.value)) : []
  const counted = !!field && CHOICE_TYPES.has(field.uidt)

  // Breakdown: ratings always show every star level, choices sorted by count.
  let breakdown: [string, number][] = []
  let average: number | null = null
  if (field && counted && answered.length) {
    const counts = new Map<string, number>()
    if (field.uidt === 'Rating') {
      const max = field.rating?.max ?? 5
      for (let v = max; v >= 1; v--) counts.set(String(v), 0)
      average = answered.reduce((sum, a) => sum + Number(a.value), 0) / answered.length
    }
    answered.forEach(a => valuesOf(field, a.value).forEach(v => counts.set(v, (counts.get(v) || 0) + 1)))
    breakdown = [...counts.entries()]
    if (field.uidt !== 'Rating') breakdown.sort((a, b) => b[1] - a[1])
  }
  const maxCount = Math.max(1, ...breakdown.map(([, n]) => n))

  const q = search.trim().toLowerCase()
  const shown = field
    ? answered
        .filter(a => picked === null || valuesOf(field, a.value).includes(picked))
        .filter(
          a =>
            !q ||
            String(a.value ?? '')
              .toLowerCase()
              .includes(q)
        )
        .sort((a, b) => (field.uidt === 'Rating' ? Number(a.value) - Number(b.value) : 0) || a.id - b.id)
    : []

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium transition-colors ${
      active
        ? 'bg-[var(--sr-ink)] text-[var(--sr-on-strong)] border-[var(--sr-ink)]'
        : 'bg-[var(--sr-card)] text-[var(--sr-body)] border-[var(--sr-line)] hover:border-[var(--sr-ink)]'
    }`

  return (
    <Page hideHeader hideFooter>
      <Head>
        <title>{field ? `Survey: ${field.title}` : 'Survey Review'}</title>
      </Head>
      <SurveyTheme />
      <div className={`${PAGE_BG} py-4 px-4`}>
        <div className="max-w-[820px] mx-auto flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            {from && (
              <Link
                href={`${base}/${from}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--sr-line)] bg-[var(--sr-card)] text-sm font-medium text-[var(--sr-ink)] hover:border-[var(--sr-ink)] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to response
              </Link>
            )}
            {questions.length > 0 && (
              <select
                value={column}
                onChange={e =>
                  router.push({ pathname: router.pathname, query: { ...router.query, column: e.target.value } })
                }
                className="flex-1 min-w-0 h-9 px-3 border border-[var(--sr-line)] bg-[var(--sr-card)] rounded-lg text-sm text-[var(--sr-ink)]"
                aria-label="Pick a question"
              >
                {pickerGroups.map((g, gi) => (
                  <optgroup key={`${g.title}-${gi}`} label={g.title}>
                    {g.fields.map(f => (
                      <option key={f.id} value={f.column_name}>
                        {f.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
            {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--sr-muted)]" aria-label="Loading" />}
          </div>

          {error && <p className="text-sm text-[var(--sr-bad)]">{error}</p>}

          {field && (
            <>
              <div className={`${CARD} p-6 flex flex-col gap-4`}>
                <div className="flex flex-col gap-1">
                  {surveyTitle && (
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--sr-accent)]">
                      {surveyTitle}
                    </span>
                  )}
                  <h1 className="text-2xl font-extrabold text-[var(--sr-ink)]">{field.title}</h1>
                  <p className="text-sm text-[var(--sr-muted)]">
                    <b className="text-[var(--sr-ink)]">{answered.length}</b> answered · {pool.length - answered.length}{' '}
                    didn&apos;t answer · {role === 'all' ? 'all roles that were asked' : `${roleLabel(role)} only`}
                  </p>
                </div>

                {roles.length > 1 && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by role">
                    <button type="button" className={chip(role === 'all')} onClick={() => setRole('all')}>
                      All roles <span className="opacity-60">{answers.length}</span>
                    </button>
                    {roles.map(([r, n]) => (
                      <button key={r} type="button" className={chip(role === r)} onClick={() => setRole(r)}>
                        {roleLabel(r)} <span className="opacity-60">{n}</span>
                      </button>
                    ))}
                  </div>
                )}

                {breakdown.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {breakdown.map(([v, n]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPicked(picked === v ? null : v)}
                        aria-pressed={picked === v}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(80px,220px)_minmax(0,1fr)_80px] items-center gap-x-3 gap-y-1 px-2 py-1 rounded-lg border text-left transition-colors ${
                          picked === v
                            ? 'border-[var(--sr-accent-line)] bg-[var(--sr-accent-bg)]'
                            : 'border-transparent hover:bg-[var(--sr-soft)]'
                        }`}
                      >
                        <span className="text-sm text-[var(--sr-body)] truncate" title={v}>
                          {field.uidt === 'Rating' ? `${'★'.repeat(Number(v))} ${v}` : v}
                        </span>
                        <span className="order-3 sm:order-none col-span-2 sm:col-span-1 block h-3 rounded-full bg-[var(--sr-chip)] overflow-hidden">
                          <span
                            className="block h-full rounded-full bg-[var(--sr-accent)]"
                            style={{ width: `${(n / maxCount) * 100}%`, minWidth: n ? 2 : 0 }}
                          />
                        </span>
                        <span className="text-xs text-[var(--sr-muted)] text-right tabular-nums whitespace-nowrap">
                          {n} · {Math.round((n / answered.length) * 100)}%
                        </span>
                      </button>
                    ))}
                    <p className="text-xs text-[var(--sr-faint)] mt-1">
                      {average != null ? `Average ${average.toFixed(1)}/${field.rating?.max ?? 5}. ` : ''}Click a bar to
                      show only those answers{field.uidt === 'MultiSelect' ? ' (people could pick several)' : ''}.
                    </p>
                  </div>
                )}
              </div>

              {!counted && (
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search these answers"
                  aria-label="Search these answers"
                  className="h-10 px-3 border border-[var(--sr-line)] bg-[var(--sr-card)] rounded-lg text-sm"
                />
              )}

              <div className="flex items-center gap-3 text-sm text-[var(--sr-muted)]">
                {picked !== null ? (
                  <>
                    Showing {shown.length} answering &ldquo;{picked}&rdquo;
                    <button
                      type="button"
                      onClick={() => setPicked(null)}
                      className="px-2.5 py-0.5 rounded-full border border-[var(--sr-line)] bg-[var(--sr-card)] text-xs hover:border-[var(--sr-ink)]"
                    >
                      Show all
                    </button>
                  </>
                ) : (
                  <>Showing {shown.length}</>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {shown.map(a => (
                  <div key={a.id} className={`${CARD} px-5 py-4 flex flex-col gap-2`}>
                    <div className="flex items-center justify-between gap-3 text-sm text-[var(--sr-muted)]">
                      <span>
                        <b className="text-[var(--sr-ink)] tabular-nums">#{a.id}</b> {roleLabel(a.role)}
                      </span>
                      <Link
                        href={`${base}/${a.id}`}
                        className="px-3 py-1 rounded-full border border-[var(--sr-line)] text-xs font-medium text-[var(--sr-ink)] hover:border-[var(--sr-ink)] transition-colors"
                      >
                        Open response ›
                      </Link>
                    </div>
                    <AnswerValue field={field} value={a.value} />
                  </div>
                ))}
                {shown.length === 0 && !loading && <p className="text-sm text-[var(--sr-muted)]">No answers match.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </Page>
  )
}
