import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import Page from 'components/common/layouts/page'
import type { FormField } from 'services/nocodb-meta'
import { Check, Star, ExternalLink, Loader2, ChevronLeft, ChevronRight, Mail, ListFilter } from 'lucide-react'
import {
  CARD,
  PAGE_BG,
  SurveyTheme,
  Section,
  AnswerValue,
  SurveyPasswordGate,
  isEmpty,
  isUnanswered,
  parseSection,
} from 'components/domain/survey-review'
import {
  ResponseList,
  useSurveyResponses,
  useListFilters,
  filterResponses,
} from 'components/domain/survey-review/ResponseList'
import {
  readStoredPassword,
  storePassword,
  clearStoredPassword,
  BUILDER_REVIEW_PASSWORD_KEY,
} from 'utils/adminPassword'

// Survey response viewer: the builder-review page's look, but generic. It
// renders whatever questions the NocoDB form has, in form order, so a new
// survey only needs its view id allowlisted in services/survey-review.ts.
// A side panel lists every response with role filters and a word search;
// Prev/Next and the ← → keys follow that filtered list. Gated by the builder
// review password.

type SurveyRecord = Record<string, unknown>

interface Nav {
  prevId: number | null
  nextId: number | null
  position: number
  total: number
}

const EMPTY_NAV: Nav = { prevId: null, nextId: null, position: 0, total: 0 }

function NavButton({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--sr-line-soft)] text-sm font-medium text-[var(--sr-disabled)] cursor-not-allowed">
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      scroll={false}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--sr-line)] text-sm font-medium text-[var(--sr-ink)] hover:border-[var(--sr-ink)] hover:bg-[var(--sr-soft)] transition-colors"
    >
      {children}
    </Link>
  )
}

export default function SurveyReviewPage() {
  const router = useRouter()
  const viewId = typeof router.query.viewId === 'string' ? router.query.viewId : undefined
  const id = typeof router.query.id === 'string' ? router.query.id : undefined

  const [secret, setSecret] = useState<string | null>(null)
  const [record, setRecord] = useState<SurveyRecord | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [survey, setSurvey] = useState<{ title: string; viewTitle: string } | null>(null)
  const [nocodbUrl, setNocodbUrl] = useState<string | null>(null)
  const [hasNotes, setHasNotes] = useState(false)
  const [role, setRole] = useState('')
  // Id of the response whose data is on screen. While another one loads, the
  // page shows the previous data dimmed and notes can't be saved.
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const loadedIdRef = useRef<string | null>(null)
  const loadSeq = useRef(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hideUnanswered, setHideUnanswered] = useState(false)
  const [comment, setComment] = useState('')
  const [savedComment, setSavedComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  const base = viewId ? `/en/survey-review/${viewId}` : ''

  const { responses, error: listError, markNote } = useSurveyResponses(viewId, secret)
  const [filters, setFilters] = useListFilters(viewId)
  const filtered = useMemo(() => (responses ? filterResponses(responses, filters) : []), [responses, filters])
  const currentId = id ? Number(id) : null

  // Prev/Next follow the side panel's filtered, sorted list (disabled until it
  // loads). When this response is filtered out, position is 0 and Next goes to
  // the first match.
  const listNav = useMemo<Nav | null>(() => {
    if (!responses) return null
    const idx = filtered.findIndex(r => r.id === currentId)
    if (idx < 0) return { prevId: null, nextId: filtered[0]?.id ?? null, position: 0, total: filtered.length }
    return {
      prevId: idx > 0 ? filtered[idx - 1].id : null,
      nextId: idx < filtered.length - 1 ? filtered[idx + 1].id : null,
      position: idx + 1,
      total: filtered.length,
    }
  }, [responses, filtered, currentId])
  const activeNav = listNav ?? EMPTY_NAV
  const stale = loading || loadedId !== id

  useEffect(() => {
    const s = readStoredPassword(BUILDER_REVIEW_PASSWORD_KEY)
    if (s) setSecret(s)
  }, [])

  const load = useCallback(
    async (key: string) => {
      if (!viewId || !id) return
      // Only the latest request may update the page: with quick Prev/Next
      // clicks an older response can arrive after a newer one.
      const seq = ++loadSeq.current
      const isCurrent = () => seq === loadSeq.current
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/survey/review/${viewId}/${id}`, {
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
        setRecord(json.record)
        setLoadedId(id)
        loadedIdRef.current = id
        setFields(Array.isArray(json.fields) ? json.fields : [])
        setSurvey(json.survey ?? null)
        setNocodbUrl(json.nocodbUrl ?? null)
        setHasNotes(!!json.hasNotes)
        setRole(typeof json.role === 'string' ? json.role : '')
        const note = String(json.record?.['Admin Notes'] ?? '')
        setComment(note)
        setSavedComment(note)
      } catch (e) {
        if (isCurrent()) setError((e as Error).message)
      } finally {
        if (isCurrent()) setLoading(false)
      }
    },
    [viewId, id]
  )

  useEffect(() => {
    if (secret && viewId && id) load(secret)
  }, [secret, viewId, id, load])

  // ← → keys move between responses (ignored while typing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      // scroll: false keeps the reader's place when moving between responses.
      if (e.key === 'ArrowLeft' && activeNav.prevId != null)
        router.push(`${base}/${activeNav.prevId}`, undefined, { scroll: false })
      else if (e.key === 'ArrowRight' && activeNav.nextId != null)
        router.push(`${base}/${activeNav.nextId}`, undefined, { scroll: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeNav.prevId, activeNav.nextId, router, base])

  async function saveComment() {
    // Save only to the response that is actually on screen.
    const target = loadedId
    if (!viewId || !secret || !target || stale) return
    setSavingComment(true)
    setError(null)
    try {
      const res = await fetch(`/api/survey/review/${viewId}/${target}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': secret },
        body: JSON.stringify({ comment }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || 'Could not save note')
        return
      }
      markNote(Number(target), comment.trim() !== '')
      // If the reviewer has moved on meanwhile, the next load sets the note state.
      if (target === loadedIdRef.current) setSavedComment(comment)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSavingComment(false)
    }
  }

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

  // Identity for the header: a name-like answer, else the first email answer.
  const nameField = fields.find(f => /name/i.test(f.title) && !isEmpty(record?.[f.column_name]))
  const emailField = fields.find(f => f.uidt === 'Email' && !isEmpty(record?.[f.column_name]))
  const name = nameField ? String(record?.[nameField.column_name]) : ''
  const email = emailField ? String(record?.[emailField.column_name]) : ''
  const submitted = record?.['CreatedAt'] ?? record?.['created_at']

  const answerable = fields.filter(f => f.uidt !== 'Checkbox')
  const answeredCount = answerable.filter(f => !isUnanswered(f, record?.[f.column_name])).length
  const ratings = fields
    .filter(f => f.uidt === 'Rating' && !isUnanswered(f, record?.[f.column_name]))
    .map(f => Number(record?.[f.column_name]) / (f.rating?.max ?? 5))
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 5 : null

  // Group questions into the form's sections (a field carrying a `section`
  // block starts a new one). Questions before the first section go under
  // "Responses".
  const groups: { title: string; intro: string; fields: FormField[] }[] = []
  for (const f of fields) {
    if (f.section || groups.length === 0) {
      const { title, intro } = f.section ? parseSection(f.section) : { title: 'Responses', intro: '' }
      groups.push({ title: title || 'Responses', intro, fields: [] })
    }
    groups[groups.length - 1].fields.push(f)
  }

  return (
    <Page hideHeader hideFooter>
      <Head>
        <title>{record ? `Survey: ${name || email || `#${id}`}` : 'Survey Review'}</title>
      </Head>
      <SurveyTheme />
      <div className={`${PAGE_BG} py-4 px-4`}>
        <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
          <ResponseList
            responses={responses}
            filtered={filtered}
            error={listError}
            filters={filters}
            onFilters={setFilters}
            currentId={currentId}
            hrefFor={rid => `${base}/${rid}`}
            overviewHref={`${base}/overview${id ? `?from=${id}` : ''}`}
          />
          <div className="min-w-0 max-w-[820px] w-full flex flex-col gap-6">
            {loading && !record && (
              <div className="flex items-center gap-2 text-[var(--sr-muted)]">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            )}
            {error && <p className="text-sm text-[var(--sr-bad)]">{error}</p>}

            {record && (
              <>
                {(activeNav.total > 0 || listNav) && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--sr-muted)]">
                      {activeNav.position > 0
                        ? `Response ${activeNav.position} of ${activeNav.total}`
                        : `Not in the current filter (${activeNav.total} shown)`}
                      <span className="hidden sm:inline text-[var(--sr-faint)]"> · use ← → keys</span>
                      {loading && (
                        <span className="inline-flex items-center gap-1.5 ml-2 align-[-4px] px-2.5 py-1 rounded-full bg-[var(--sr-accent)] text-[var(--sr-on-strong)] text-xs font-bold">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Loading…
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <NavButton href={activeNav.prevId != null ? `${base}/${activeNav.prevId}` : null}>
                        <ChevronLeft className="w-4 h-4" /> Prev
                      </NavButton>
                      <NavButton href={activeNav.nextId != null ? `${base}/${activeNav.nextId}` : null}>
                        Next <ChevronRight className="w-4 h-4" />
                      </NavButton>
                    </div>
                  </div>
                )}

                <div
                  className={`flex flex-col gap-6 transition-opacity ${stale ? 'opacity-50' : ''}`}
                  aria-busy={stale}
                >
                  {/* Header */}
                  <div className={`${CARD} p-6 flex flex-col gap-4`}>
                    <div className="flex flex-col gap-1">
                      {survey && (
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--sr-accent)]">
                          {survey.title}
                        </span>
                      )}
                      <h1 className="text-2xl font-extrabold text-[var(--sr-ink)]">
                        {name || `Response #${loadedId}`}
                      </h1>
                      <p className="text-sm text-[var(--sr-muted)]">
                        {email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" aria-hidden="true" /> {email}
                          </span>
                        )}
                        {email && submitted ? ' · ' : ''}
                        {submitted ? `Submitted ${new Date(String(submitted)).toLocaleDateString()}` : ''}
                      </p>
                      {nocodbUrl && (
                        <a
                          href={nocodbUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--sr-accent)] hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" aria-hidden="true" /> Open in NocoDB
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {role && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--sr-ink)] text-[var(--sr-on-strong)] text-sm font-bold">
                          {role}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--sr-accent-bg)] text-[var(--sr-accent)] border border-[var(--sr-accent-line)] text-sm font-bold">
                        {answeredCount} of {answerable.length} answered
                      </span>
                      {avgRating != null && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--sr-gold-bg)] text-[var(--sr-gold)] border border-[var(--sr-gold-line)] text-sm font-bold">
                          <Star className="w-4 h-4 fill-current" aria-hidden="true" /> Avg rating {avgRating.toFixed(1)}
                          /5
                        </span>
                      )}
                    </div>
                  </div>

                  {hasNotes && (
                    <div className={`${CARD} p-6`}>
                      <Section title="Admin notes">
                        <textarea
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          placeholder="Add a private note about this response (visible to reviewers only)…"
                          rows={3}
                          className="w-full px-3 py-2 border border-[var(--sr-line)] bg-[var(--sr-soft)] focus:bg-[var(--sr-card)] rounded-lg text-sm text-[var(--sr-ink)] leading-5 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sr-accent-ring)]"
                        />
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={saveComment}
                            disabled={stale || savingComment || comment === savedComment}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--sr-ink)] text-[var(--sr-on-strong)] text-sm font-semibold hover:bg-[var(--sr-ink-hover)] disabled:opacity-50 transition-colors"
                          >
                            {savingComment && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                            Save note
                          </button>
                          {comment !== savedComment ? (
                            <span className="text-xs text-[var(--sr-warn)]">Unsaved changes</span>
                          ) : savedComment ? (
                            <span className="inline-flex items-center gap-1 text-xs text-[var(--sr-good)]">
                              <Check className="w-3.5 h-3.5" aria-hidden="true" /> Saved
                            </span>
                          ) : null}
                        </div>
                      </Section>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm text-[var(--sr-muted)] w-fit cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hideUnanswered}
                      onChange={e => setHideUnanswered(e.target.checked)}
                      className="accent-[var(--sr-accent)]"
                    />
                    Hide unanswered questions
                  </label>

                  {groups.map((g, gi) => {
                    const visible = hideUnanswered
                      ? g.fields.filter(f => f.uidt === 'Checkbox' || !isUnanswered(f, record[f.column_name]))
                      : g.fields
                    if (visible.length === 0) return null
                    return (
                      <div key={`${g.title}-${gi}`} className={`${CARD} p-6`}>
                        <Section title={g.title}>
                          {g.intro && <p className="text-xs text-[var(--sr-muted)] leading-5 -mt-1">{g.intro}</p>}
                          <div className="flex flex-col divide-y divide-[var(--sr-divider)]">
                            {visible.map(f => (
                              <div key={f.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm font-bold text-[var(--sr-ink)]">{f.title}</p>
                                  <Link
                                    href={`${base}/question?column=${encodeURIComponent(f.column_name)}&from=${id}`}
                                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[var(--sr-line)] text-xs font-medium text-[var(--sr-muted)] hover:text-[var(--sr-accent)] hover:border-[var(--sr-accent-line)] hover:bg-[var(--sr-accent-bg)] transition-colors"
                                    title="See everyone's answer to this question"
                                  >
                                    <ListFilter className="w-3 h-3" aria-hidden="true" /> All answers
                                  </Link>
                                </div>
                                <AnswerValue field={f} value={record[f.column_name]} />
                              </div>
                            ))}
                          </div>
                        </Section>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Page>
  )
}
