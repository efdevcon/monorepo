import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { BarChart3, ChevronRight, Loader2, Search, Star } from 'lucide-react'
import { CARD } from 'components/domain/survey-review'
import { normalizeSearchText } from 'services/survey-review-shared'

// Side panel for the survey review page: every response, with role filters,
// a word search across all answers and emails, an "only with written comments" toggle
// and a sort by average rating. The filtered, sorted list also drives
// Prev/Next and the ← → keys on the page.

export interface ResponseSummary {
  id: number
  email?: string | null
  role: string
  avgRating: number | null
  snippet: string
  hasWritten: boolean
  hasNote: boolean
  text: string
}

export type ListSort = 'id' | 'low' | 'high'

export interface ListFilters {
  role: string
  q: string
  written: boolean
  sort: ListSort
}

const DEFAULT_FILTERS: ListFilters = { role: 'all', q: '', written: false, sort: 'id' }

const SORT_LABELS: Record<ListSort, string> = {
  id: 'Response #',
  low: 'Lowest rating first',
  high: 'Highest rating first',
}

const ROLE_SHORT: Record<string, string> = {
  'Ecosystem / Community Org (incl. Student Groups)': 'Ecosystem / Community Org',
  'Volunteer / Volunteer Lead': 'Volunteer',
}

/** Shorter role names for chips and lists. */
export const roleLabel = (r: string) => ROLE_SHORT[r] || r || 'No role'

/** Loads the response list once per page visit; `markNote` keeps the note dots current after a save. */
export function useSurveyResponses(viewId: string | undefined, secret: string | null) {
  const [responses, setResponses] = useState<ResponseSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!viewId || !secret) return
    let cancelled = false
    setError(null)
    fetch(`/api/survey/review/${viewId}`, { headers: { 'x-admin-key': secret }, cache: 'no-store' })
      .then(async res => {
        const json = await res.json()
        if (cancelled) return
        if (!res.ok || !json.success) setError(json.error || `Could not load the response list (${res.status})`)
        else setResponses(Array.isArray(json.responses) ? json.responses : [])
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [viewId, secret])

  const markNote = useCallback((id: number, hasNote: boolean) => {
    setResponses(rs => (rs ? rs.map(r => (r.id === id ? { ...r, hasNote } : r)) : rs))
  }, [])

  return { responses, error, markNote }
}

/** Filters kept for the browser tab, so they survive opening a question page and coming back. */
export function useListFilters(viewId: string | undefined): [ListFilters, (patch: Partial<ListFilters>) => void] {
  const key = `survey-review-filters:${viewId ?? ''}`
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key)
      if (saved) setFilters({ ...DEFAULT_FILTERS, ...JSON.parse(saved) })
    } catch {
      // storage unavailable: keep defaults
    }
  }, [key])

  const update = useCallback(
    (patch: Partial<ListFilters>) => {
      setFilters(prev => {
        const next = { ...prev, ...patch }
        try {
          sessionStorage.setItem(key, JSON.stringify(next))
        } catch {
          // storage unavailable: filters still work for this page
        }
        return next
      })
    },
    [key]
  )

  return [filters, update]
}

export function filterResponses(responses: ResponseSummary[], f: ListFilters): ResponseSummary[] {
  const q = normalizeSearchText(f.q) // r.text is normalised the same way on the server
  const shown = responses.filter(
    r => (f.role === 'all' || r.role === f.role) && (!f.written || r.hasWritten) && (!q || r.text.includes(q))
  )
  if (f.sort === 'id') return shown
  // By average rating; responses without any rating go last either way.
  const dir = f.sort === 'low' ? 1 : -1
  return [...shown].sort((a, b) => {
    if (a.avgRating == null || b.avgRating == null) {
      return (a.avgRating == null ? 1 : 0) - (b.avgRating == null ? 1 : 0) || a.id - b.id
    }
    return (a.avgRating - b.avgRating) * dir || a.id - b.id
  })
}

interface ResponseListProps {
  responses: ResponseSummary[] | null
  filtered: ResponseSummary[]
  error: string | null
  filters: ListFilters
  onFilters: (patch: Partial<ListFilters>) => void
  currentId: number | null
  hrefFor: (id: number) => string
  overviewHref?: string
}

export function ResponseList({
  responses,
  filtered,
  error,
  filters,
  onFilters,
  currentId,
  hrefFor,
  overviewHref,
}: ResponseListProps) {
  const [q, setQ] = useState(filters.q)
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the box in step when saved filters load, and debounce typing.
  useEffect(() => setQ(filters.q), [filters.q])
  useEffect(() => {
    if (q === filters.q) return
    const t = setTimeout(() => onFilters({ q }), 150)
    return () => clearTimeout(t)
  }, [q, filters.q, onFilters])

  // Keep the open response visible in the list. Only the list scrolls (not the
  // panel or the page, as scrollIntoView would).
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!list || !item) return
    const l = list.getBoundingClientRect()
    const i = item.getBoundingClientRect()
    if (i.top < l.top) list.scrollTop += i.top - l.top
    else if (i.bottom > l.bottom) list.scrollTop += i.bottom - l.bottom
  }, [currentId, filtered.length])

  const roles = useMemo(() => {
    const counts = new Map<string, number>()
    ;(responses ?? []).forEach(r => counts.set(r.role, (counts.get(r.role) || 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [responses])

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
      active
        ? 'bg-[var(--sr-ink)] text-[var(--sr-on-strong)] border-[var(--sr-ink)]'
        : 'bg-[var(--sr-card)] text-[var(--sr-body)] border-[var(--sr-line)] hover:border-[var(--sr-ink)]'
    }`

  return (
    <aside
      className={`${CARD} flex flex-col overflow-y-auto lg:sticky lg:top-4 max-h-[75vh] lg:max-h-[calc(100vh-2rem)]`}
      aria-label="Responses"
    >
      <div className="shrink-0 flex flex-col gap-3 p-3 border-b border-[var(--sr-divider)]">
        {overviewHref && (
          <Link
            href={overviewHref}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--sr-accent-bg)] border border-[var(--sr-accent-line)] text-sm font-semibold text-[var(--sr-accent)] hover:border-[var(--sr-accent)] transition-colors"
          >
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            <span className="flex-1">Overview & stats</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        )}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by role">
          <button type="button" className={chip(filters.role === 'all')} onClick={() => onFilters({ role: 'all' })}>
            All <span className="opacity-60 tabular-nums">{responses?.length ?? ''}</span>
          </button>
          {roles.map(([r, n]) => (
            <button key={r} type="button" className={chip(filters.role === r)} onClick={() => onFilters({ role: r })}>
              {roleLabel(r)} <span className="opacity-60 tabular-nums">{n}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 h-9 px-3 border border-[var(--sr-line)] bg-[var(--sr-card)] rounded-lg focus-within:border-[var(--sr-accent)]">
          <Search className="w-4 h-4 text-[var(--sr-faint)] shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search answers or email"
            aria-label="Search answers or email"
            className="flex-1 min-w-0 bg-transparent text-sm text-[var(--sr-ink)] outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--sr-muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.written}
            onChange={e => onFilters({ written: e.target.checked })}
            className="accent-[var(--sr-accent)]"
          />
          Only with written comments
        </label>
      </div>

      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--sr-divider)]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--sr-muted)] tabular-nums">
          {responses ? `${filtered.length} shown` : 'Responses'}
        </span>
        <label className="flex items-center gap-1.5 text-xs text-[var(--sr-muted)]">
          Sort
          <select
            value={filters.sort}
            onChange={e => onFilters({ sort: e.target.value as ListSort })}
            className="h-7 px-1.5 border border-[var(--sr-line)] bg-[var(--sr-card)] rounded-md text-xs text-[var(--sr-ink)]"
            aria-label="Sort responses"
          >
            {(Object.keys(SORT_LABELS) as ListSort[]).map(k => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div ref={listRef} className="flex-1 min-h-[12rem] overflow-y-auto">
        {error && <p className="p-3 text-sm text-[var(--sr-bad)]">{error}</p>}
        {!responses && !error && (
          <p className="flex items-center gap-2 p-3 text-sm text-[var(--sr-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading responses…
          </p>
        )}
        {responses && filtered.length === 0 && (
          <p className="p-3 text-sm text-[var(--sr-muted)]">No responses match these filters.</p>
        )}
        {filtered.map(r => (
          <Link
            key={r.id}
            href={hrefFor(r.id)}
            scroll={false}
            aria-current={r.id === currentId ? 'page' : undefined}
            className={`flex flex-col gap-0.5 px-3 py-2.5 border-b border-[var(--sr-divider)] transition-colors ${
              r.id === currentId
                ? 'bg-[var(--sr-accent-bg)] shadow-[inset_3px_0_0_var(--sr-accent)]'
                : 'hover:bg-[var(--sr-soft)]'
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm">
                <b className="tabular-nums text-[var(--sr-ink)]">#{r.id}</b>{' '}
                <span className="text-xs text-[var(--sr-muted)]">{roleLabel(r.role)}</span>
                {r.hasNote && (
                  <span
                    className="inline-block w-1.5 h-1.5 ml-1.5 rounded-full bg-[var(--sr-accent)] align-middle"
                    title="Has a note"
                  />
                )}
              </span>
              {r.avgRating != null && (
                <span className="inline-flex items-center gap-0.5 text-xs text-[var(--sr-muted)] tabular-nums">
                  <Star className="w-3 h-3 fill-current text-[var(--sr-star)]" aria-hidden="true" />
                  {r.avgRating.toFixed(1)}
                </span>
              )}
            </span>
            {r.email && <span className="text-xs text-[var(--sr-body)] truncate">{r.email}</span>}
            <span className="text-xs text-[var(--sr-muted)] truncate">{r.snippet || 'No written comments'}</span>
          </Link>
        ))}
      </div>
    </aside>
  )
}
