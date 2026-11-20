import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import Page from 'components/common/layouts/page'
import { ChevronLeft, ListFilter, Loader2, Star } from 'lucide-react'
import { CARD, PAGE_BG, SurveyTheme, SurveyPasswordGate } from 'components/domain/survey-review'
import { roleLabel } from 'components/domain/survey-review/ResponseList'
import { LOW_AVERAGE, MINT_ONLY_HINT, mintOnlyLabel } from 'services/survey-review-shared'
import type { OverviewStats, QuestionStat, RatingStat, OptionCount } from 'services/survey-review-stats'
import {
  readStoredPassword,
  storePassword,
  clearStoredPassword,
  BUILDER_REVIEW_PASSWORD_KEY,
} from 'utils/adminPassword'

// Survey Overview: live stats for the whole survey (or one role). Headline
// numbers, every star question ranked lowest first, answer breakdowns per
// section, and for written questions the most common words and the comments
// of the least satisfied respondents. Computed from NocoDB on each load; no AI
// service involved. Gated by the builder review password.

const TOP_RATINGS = 10
const TOP_OPTIONS = 5

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0)

// One row of headline cards on wide screens, whatever their number (2–5).
const HEADLINE_COLS: Record<number, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
}

function Bar({ value, of }: { value: number; of: number }) {
  return (
    <span className="block h-2.5 rounded-full bg-[var(--sr-chip)] overflow-hidden">
      <span
        className="block h-full rounded-full bg-[var(--sr-accent)]"
        style={{ width: `${of ? (value / of) * 100 : 0}%`, minWidth: value ? 2 : 0 }}
      />
    </span>
  )
}

/** Each answer links to the question's page showing only the people who gave it. */
function OptionBars({
  options,
  answered,
  moreHref,
  answerHref,
}: {
  options: OptionCount[]
  answered: number
  moreHref: string
  answerHref: (answer: string) => string
}) {
  const max = Math.max(1, ...options.map(o => o.count))
  const shown = options.slice(0, TOP_OPTIONS)
  return (
    <div className="flex flex-col gap-0.5">
      {shown.map(o => (
        <Link
          key={o.value}
          href={answerHref(o.value)}
          title={`Show the ${o.count} ${o.count === 1 ? 'person' : 'people'} who answered "${o.value}"`}
          aria-label={`${o.value}: ${o.count} (${pct(o.count, answered)}%). Show the people who answered this.`}
          className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(80px,220px)_minmax(0,1fr)_76px] items-center gap-x-3 gap-y-1 py-1 px-2 -mx-2 rounded-lg hover:bg-[var(--sr-soft)] transition-colors"
        >
          <span className="text-sm text-[var(--sr-body)] truncate" title={o.value}>
            {o.value}
          </span>
          <span className="order-3 sm:order-none col-span-2 sm:col-span-1">
            <Bar value={o.count} of={max} />
          </span>
          <span className="text-xs text-[var(--sr-muted)] text-right tabular-nums whitespace-nowrap">
            {o.count} · {pct(o.count, answered)}%
          </span>
        </Link>
      ))}
      {options.length > TOP_OPTIONS && (
        <Link href={moreHref} className="text-xs text-[var(--sr-accent)] hover:underline w-fit">
          {options.length - TOP_OPTIONS} more answers ›
        </Link>
      )}
    </div>
  )
}

function RatingRow({ stat, href }: { stat: RatingStat; href: string }) {
  const low = stat.average != null && stat.average / stat.max <= 0.7
  return (
    <Link
      href={href}
      className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_minmax(120px,240px)_110px] items-center gap-x-4 gap-y-1 py-2 px-2 -mx-2 rounded-lg hover:bg-[var(--sr-soft)] transition-colors"
    >
      <span className="text-sm text-[var(--sr-ink)] min-w-0">{stat.title}</span>
      <span className="order-3 sm:order-none col-span-2 sm:col-span-1">
        <Bar value={stat.average ?? 0} of={stat.max} />
      </span>
      <span className="text-right whitespace-nowrap tabular-nums">
        <b className={`text-sm ${low ? 'text-[var(--sr-warn)]' : 'text-[var(--sr-ink)]'}`}>
          {stat.average?.toFixed(1) ?? '–'}
        </b>
        <span className="text-xs text-[var(--sr-muted)]">
          /{stat.max} · {stat.answered}
        </span>
      </span>
    </Link>
  )
}

function HeadlineCard({ label, value, sub, href }: { label: string; value: string; sub: string; href?: string }) {
  const body = (
    <>
      <span className="text-xs font-semibold text-[var(--sr-muted)] leading-snug">{label}</span>
      <span className="text-3xl font-extrabold text-[var(--sr-ink)] tabular-nums">{value}</span>
      <span className="text-xs text-[var(--sr-faint)]">{sub}</span>
    </>
  )
  // A question's card opens its answers.
  return href ? (
    <Link
      href={href}
      className={`${CARD} p-5 flex flex-col gap-1 min-w-0 hover:border-[var(--sr-accent-line)] transition-colors`}
    >
      {body}
    </Link>
  ) : (
    <div className={`${CARD} p-5 flex flex-col gap-1 min-w-0`}>{body}</div>
  )
}

function headlineFor(s: QuestionStat): { value: string; sub: string } {
  if (s.kind === 'rating') return { value: `${s.average?.toFixed(1) ?? '–'}/${s.max}`, sub: `${s.answered} answered` }
  if (s.kind === 'choice' && s.options[0]) {
    return {
      value: `${pct(s.options[0].count, s.answered)}%`,
      sub: `answered “${s.options[0].value}” · ${s.answered} answered`,
    }
  }
  if (s.kind === 'number') return { value: s.average?.toFixed(1) ?? '–', sub: `average · ${s.answered} answered` }
  return { value: String(s.answered), sub: 'written answers' }
}

export default function SurveyOverviewPage() {
  const router = useRouter()
  const viewId = typeof router.query.viewId === 'string' ? router.query.viewId : undefined
  const from = typeof router.query.from === 'string' ? router.query.from : undefined

  const [secret, setSecret] = useState<string | null>(null)
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [surveyTitle, setSurveyTitle] = useState('')
  const [mintOnlyHidden, setMintOnlyHidden] = useState(0)
  // null = all roles. '' is a real value: responses with no role.
  const [role, setRole] = useState<string | null>(null)
  // The role the stats on screen were computed for (lags `role` while loading).
  const [shownRole, setShownRole] = useState<string | null>(null)
  const loadSeq = useRef(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allRatings, setAllRatings] = useState(false)

  const base = viewId ? `/en/survey-review/${viewId}` : ''
  // Links to a question carry the role the stats on screen are for, so the
  // answers listed there match the counts shown here.
  const questionHref = (column: string, q?: string, answer?: string) => {
    const params = new URLSearchParams({ column })
    if (q) params.set('q', q)
    if (answer !== undefined) params.set('answer', answer)
    if (shownRole !== null) params.set('role', shownRole)
    if (from) params.set('from', from)
    return `${base}/question?${params.toString()}`
  }

  useEffect(() => {
    const s = readStoredPassword(BUILDER_REVIEW_PASSWORD_KEY)
    if (s) setSecret(s)
  }, [])

  const load = useCallback(
    async (key: string, forRole: string | null) => {
      if (!viewId) return
      // Only the latest request may update the page: quick role clicks can
      // return out of order.
      const seq = ++loadSeq.current
      const isCurrent = () => seq === loadSeq.current
      setLoading(true)
      setError(null)
      try {
        const qs = forRole === null ? '' : `?role=${encodeURIComponent(forRole)}`
        const res = await fetch(`/api/survey/review/${viewId}/overview${qs}`, {
          headers: { 'x-admin-key': key },
          cache: 'no-store',
        })
        if (!isCurrent()) return
        if (res.status === 401) {
          clearStoredPassword(BUILDER_REVIEW_PASSWORD_KEY)
          setSecret(null)
          setError('Invalid password.')
          return
        }
        const json = await res.json()
        if (!isCurrent()) return
        if (!res.ok || !json.success) {
          setError(json.error || `Failed to load (${res.status})`)
          return
        }
        setOverview(json.overview)
        setMintOnlyHidden(Number(json.mintOnlyHidden) || 0)
        setShownRole(forRole)
        setSurveyTitle(json.survey?.title ?? '')
      } catch (e) {
        if (isCurrent()) setError((e as Error).message)
      } finally {
        if (isCurrent()) setLoading(false)
      }
    },
    [viewId]
  )

  useEffect(() => {
    if (secret && viewId) load(secret, role)
  }, [secret, viewId, role, load])

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

  const backId = from ?? (overview?.firstId != null ? String(overview.firstId) : null)
  const allCount = overview?.roleCounts.reduce((a, r) => a + r.count, 0) ?? 0
  const ratings = overview
    ? allRatings
      ? overview.ratingsLowestFirst
      : overview.ratingsLowestFirst.slice(0, TOP_RATINGS)
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
        <title>Survey overview</title>
      </Head>
      <SurveyTheme />
      <div className={`${PAGE_BG} py-4 px-4`}>
        <div className="max-w-[1180px] mx-auto flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            {backId && (
              <Link
                href={`${base}/${backId}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--sr-line)] bg-[var(--sr-card)] text-sm font-medium text-[var(--sr-ink)] hover:border-[var(--sr-ink)] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Responses
              </Link>
            )}
            {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--sr-muted)]" aria-label="Loading" />}
          </div>

          {error && <p className="text-sm text-[var(--sr-bad)]">{error}</p>}

          {overview && (
            <>
              <div className={`${CARD} p-6 flex flex-col gap-4`}>
                <div className="flex flex-col gap-1">
                  {surveyTitle && (
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--sr-accent)]">
                      {surveyTitle}
                    </span>
                  )}
                  <h1 className="text-2xl font-extrabold text-[var(--sr-ink)]">Overview</h1>
                  <p className="text-sm text-[var(--sr-muted)]">
                    Live from NocoDB · {shownRole === null ? 'all roles' : `${roleLabel(shownRole)} only`}. Each
                    question counts only the people who were asked it.
                    {mintOnlyHidden > 0 && (
                      <>
                        {' '}
                        <span title={MINT_ONLY_HINT}>{mintOnlyLabel(mintOnlyHidden)}.</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by role">
                  <button type="button" className={chip(role === null)} onClick={() => setRole(null)}>
                    All roles <span className="opacity-60 tabular-nums">{allCount}</span>
                  </button>
                  {overview.roleCounts.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      className={chip(role === r.value)}
                      onClick={() => setRole(r.value)}
                    >
                      {roleLabel(r.value)} <span className="opacity-60 tabular-nums">{r.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`flex flex-col gap-6 transition-opacity ${loading ? 'opacity-50' : ''}`}
                aria-busy={loading}
              >
                <div
                  className={`grid grid-cols-2 ${
                    HEADLINE_COLS[Math.min(5, 2 + overview.highlights.length)]
                  } gap-4 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2`}
                >
                  <HeadlineCard
                    label="Responses"
                    value={String(overview.total)}
                    sub={shownRole === null ? 'all roles' : roleLabel(shownRole)}
                  />
                  <HeadlineCard
                    label="Average rating"
                    value={overview.averageRating != null ? `${overview.averageRating.toFixed(1)}/5` : '–'}
                    sub="each person's average across their star ratings"
                  />
                  {overview.highlights.map(h => {
                    const { value, sub } = headlineFor(h)
                    return (
                      <HeadlineCard
                        key={h.column}
                        label={h.title}
                        value={value}
                        sub={sub}
                        href={
                          h.kind === 'choice' && h.options[0]
                            ? questionHref(h.column, undefined, h.options[0].value)
                            : questionHref(h.column)
                        }
                      />
                    )
                  })}
                </div>

                {ratings.length > 0 && (
                  <div className={`${CARD} p-6 flex flex-col gap-2`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--sr-muted)]">
                        Star ratings, lowest first
                      </h2>
                      <span className="text-xs text-[var(--sr-faint)]">average · people who answered</span>
                    </div>
                    <div className="flex flex-col">
                      {ratings.map(r => (
                        <RatingRow key={r.column} stat={r} href={questionHref(r.column)} />
                      ))}
                    </div>
                    {overview.ratingsLowestFirst.length > TOP_RATINGS && (
                      <button
                        type="button"
                        onClick={() => setAllRatings(v => !v)}
                        className="text-sm text-[var(--sr-accent)] hover:underline w-fit"
                      >
                        {allRatings ? 'Show fewer' : `Show all ${overview.ratingsLowestFirst.length} star questions`}
                      </button>
                    )}
                  </div>
                )}

                {overview.sections.map((sec, si) => (
                  <div key={`${sec.title}-${si}`} className={`${CARD} p-6 flex flex-col gap-4`}>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--sr-muted)]">{sec.title}</h2>
                    <div className="flex flex-col divide-y divide-[var(--sr-divider)]">
                      {sec.questions.map(q => (
                        <div key={q.column} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-bold text-[var(--sr-ink)]">{q.title}</p>
                            <Link
                              href={questionHref(q.column)}
                              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[var(--sr-line)] text-xs font-medium text-[var(--sr-muted)] hover:text-[var(--sr-accent)] hover:border-[var(--sr-accent-line)] hover:bg-[var(--sr-accent-bg)] transition-colors"
                            >
                              <ListFilter className="w-3 h-3" aria-hidden="true" /> All answers
                            </Link>
                          </div>
                          <p className="text-xs text-[var(--sr-faint)] -mt-1 tabular-nums">
                            {q.answered} of {q.asked} answered
                          </p>

                          {q.kind === 'rating' && (
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--sr-ink)] tabular-nums">
                                <Star className="w-4 h-4 fill-current text-[var(--sr-star)]" aria-hidden="true" />
                                {q.average?.toFixed(1) ?? '–'}/{q.max}
                              </span>
                              <span className="flex-1 max-w-[320px]">
                                <Bar value={q.average ?? 0} of={q.max} />
                              </span>
                            </div>
                          )}

                          {q.kind === 'choice' && q.answered > 0 && (
                            <OptionBars
                              options={q.options}
                              answered={q.answered}
                              moreHref={questionHref(q.column)}
                              answerHref={answer => questionHref(q.column, undefined, answer)}
                            />
                          )}

                          {q.kind === 'number' && (
                            <p className="text-sm text-[var(--sr-body)]">
                              Average <b className="text-[var(--sr-ink)]">{q.average?.toFixed(1) ?? '–'}</b>
                            </p>
                          )}

                          {q.kind === 'text' && q.answered > 0 && (
                            <div className="flex flex-col gap-3">
                              {q.terms.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-xs text-[var(--sr-muted)]">Most mentioned</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {q.terms.map(t => (
                                      <Link
                                        key={t.term}
                                        href={questionHref(q.column, t.term)}
                                        title={`Show the answers that mention “${t.term}”`}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--sr-chip)] text-sm text-[var(--sr-body)] hover:bg-[var(--sr-accent-bg)] hover:text-[var(--sr-accent)] transition-colors"
                                      >
                                        {t.term} <span className="text-xs opacity-60 tabular-nums">{t.count}</span>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {q.lowest.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-xs text-[var(--sr-muted)]">
                                    From less satisfied respondents (average rating under {LOW_AVERAGE} stars), lowest
                                    first
                                  </span>
                                  {q.lowest.map(c => (
                                    <Link
                                      key={c.id}
                                      href={`${base}/${c.id}`}
                                      className="flex flex-col gap-1 p-3 rounded-lg border border-[var(--sr-divider)] bg-[var(--sr-soft)] hover:border-[var(--sr-line)] transition-colors"
                                    >
                                      <span className="text-xs text-[var(--sr-muted)] tabular-nums">
                                        #{c.id}
                                        {c.avgRating != null && ` · ★ ${c.avgRating.toFixed(1)} average`}
                                      </span>
                                      <span className="text-sm text-[var(--sr-body)] leading-6 whitespace-pre-line [overflow-wrap:anywhere]">
                                        {c.text}
                                      </span>
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Page>
  )
}
