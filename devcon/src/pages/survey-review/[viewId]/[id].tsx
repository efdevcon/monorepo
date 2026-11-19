import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import Page from 'components/common/layouts/page'
import type { FormField } from 'services/nocodb-meta'
import {
  Check,
  X,
  Star,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Paperclip,
  Mail,
} from 'lucide-react'
import {
  readStoredPassword,
  storePassword,
  clearStoredPassword,
  BUILDER_REVIEW_PASSWORD_KEY,
} from 'utils/adminPassword'

// Survey response viewer: the builder-review page's look, but generic. It
// renders whatever questions the NocoDB form has, in form order, so a new
// survey only needs its view id allowlisted in the API route
// (pages/api/survey/review/[viewId]/[id].ts). Gated by the builder review
// password.

const CARD =
  'bg-white border border-[#e5e1ed] rounded-2xl shadow-[0_1px_2px_rgba(22,11,43,0.05),0_4px_12px_-6px_rgba(22,11,43,0.06)]'
const PAGE_BG = 'bg-[#f5f3f9]'

type SurveyRecord = Record<string, unknown>

interface Nav {
  prevId: number | null
  nextId: number | null
  position: number
  total: number
}

interface Attachment {
  title?: string
  mimetype?: string
  signedUrl?: string
  url?: string
}

const EMPTY_NAV: Nav = { prevId: null, nextId: null, position: 0, total: 0 }

/** Unanswered, per field type: NocoDB stores a skipped rating as 0. */
function isUnanswered(field: FormField, v: unknown): boolean {
  if (field.uidt === 'Rating') return !(Number(v) > 0)
  return isEmpty(v)
}

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

/** Section blocks are markdown: the first line is the heading, the rest an intro. */
function parseSection(md: string): { title: string; intro: string } {
  const lines = md.trim().split('\n')
  const title = (lines[0] || '').replace(/^#+\s*/, '').trim()
  const intro = lines.slice(1).join('\n').trim()
  return { title, intro }
}

function parseAttachments(v: unknown): Attachment[] {
  if (Array.isArray(v)) return v as Attachment[]
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#594d73]">{title}</h2>
      {children}
    </div>
  )
}

const PILL = 'inline-flex items-center px-2.5 py-1 rounded-md bg-[#f1eff4] text-[#3b3450] text-sm'

/** One answer, drawn according to the NocoDB column type. */
function AnswerValue({ field, value }: { field: FormField; value: unknown }) {
  if (field.uidt === 'Checkbox') {
    return value ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e6f7ed] text-[#137a3e] border border-[#b7e6c9] text-sm font-bold w-fit">
        <Check className="w-4 h-4" aria-hidden="true" /> Yes
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f1eff4] text-[#594d73] border border-[#dddae2] text-sm font-bold w-fit">
        <X className="w-4 h-4" aria-hidden="true" /> No
      </span>
    )
  }

  if (isUnanswered(field, value)) return <p className="text-sm italic text-[#9b93ad]">No answer</p>

  switch (field.uidt) {
    case 'Rating': {
      const max = field.rating?.max ?? 5
      const n = Number(value) || 0
      return (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5" aria-label={`${n} of ${max}`}>
            {Array.from({ length: max }, (_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${i < n ? 'fill-[#f5b301] text-[#f5b301]' : 'text-[#dddae2]'}`}
                aria-hidden="true"
              />
            ))}
          </span>
          <span className="text-sm font-bold text-[#160b2b]">
            {n}/{max}
          </span>
        </div>
      )
    }
    case 'SingleSelect':
      return (
        <span className="inline-flex w-fit px-3 py-1 rounded-full bg-[#f3f0ff] text-[#7235ed] border border-[#decffb] text-sm font-bold">
          {String(value)}
        </span>
      )
    case 'MultiSelect': {
      const items = Array.isArray(value)
        ? value.map(String)
        : String(value)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
      return (
        <div className="flex flex-wrap gap-2">
          {items.map(i => (
            <span key={i} className={PILL}>
              {i}
            </span>
          ))}
        </div>
      )
    }
    case 'Date':
    case 'DateTime':
      return <p className="text-sm text-[#3b3450]">{new Date(String(value)).toLocaleDateString()}</p>
    case 'Email':
      return (
        <a href={`mailto:${String(value)}`} className="text-sm font-medium text-[#7235ed] hover:underline w-fit">
          {String(value)}
        </a>
      )
    case 'URL':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#7235ed] hover:underline w-fit break-all"
        >
          {String(value)} <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </a>
      )
    case 'Attachment': {
      const files = parseAttachments(value)
      return (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => {
            const src = f.signedUrl || f.url
            const href = src ? `/api/nocodb/file?url=${encodeURIComponent(src)}` : undefined
            return (
              <a
                key={`${f.title}-${i}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#dddae2] bg-[#f9f8fa] text-sm text-[#160b2b] hover:opacity-80"
              >
                <Paperclip className="w-4 h-4 text-[#7235ed]" aria-hidden="true" />
                <span className="truncate max-w-[240px]">{f.title || `File ${i + 1}`}</span>
              </a>
            )
          })}
        </div>
      )
    }
    default:
      if (typeof value === 'object') {
        return (
          <pre className="text-xs text-[#3b3450] bg-[#f9f8fa] rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        )
      }
      return <p className="text-sm text-[#3b3450] leading-6 whitespace-pre-line">{String(value)}</p>
  }
}

function NavButton({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#eee] text-sm font-medium text-[#c4bdd1] cursor-not-allowed">
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      scroll={false}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#dddae2] text-sm font-medium text-[#160b2b] hover:border-[#160b2b] hover:bg-[#f9f8fa] transition-colors"
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
  const [secretInput, setSecretInput] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [record, setRecord] = useState<SurveyRecord | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [survey, setSurvey] = useState<{ title: string; viewTitle: string } | null>(null)
  const [nocodbUrl, setNocodbUrl] = useState<string | null>(null)
  const [hasNotes, setHasNotes] = useState(false)
  const [role, setRole] = useState('')
  const [nav, setNav] = useState<Nav>(EMPTY_NAV)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hideUnanswered, setHideUnanswered] = useState(false)
  const [comment, setComment] = useState('')
  const [savedComment, setSavedComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  const base = viewId ? `/en/survey-review/${viewId}` : ''

  useEffect(() => {
    const s = readStoredPassword(BUILDER_REVIEW_PASSWORD_KEY)
    if (s) setSecret(s)
  }, [])

  const load = useCallback(
    async (key: string) => {
      if (!viewId || !id) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/survey/review/${viewId}/${id}`, {
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
        setRecord(json.record)
        setFields(Array.isArray(json.fields) ? json.fields : [])
        setSurvey(json.survey ?? null)
        setNocodbUrl(json.nocodbUrl ?? null)
        setHasNotes(!!json.hasNotes)
        setRole(typeof json.role === 'string' ? json.role : '')
        setNav(json.nav ?? EMPTY_NAV)
        const note = String(json.record?.['Admin Notes'] ?? '')
        setComment(note)
        setSavedComment(note)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
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
      if (e.key === 'ArrowLeft' && nav.prevId != null)
        router.push(`${base}/${nav.prevId}`, undefined, { scroll: false })
      else if (e.key === 'ArrowRight' && nav.nextId != null)
        router.push(`${base}/${nav.nextId}`, undefined, { scroll: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav.prevId, nav.nextId, router, base])

  function submitSecret(e: React.FormEvent) {
    e.preventDefault()
    const k = secretInput.trim()
    if (!k) return
    storePassword(BUILDER_REVIEW_PASSWORD_KEY, k)
    setSecret(k)
  }

  async function saveComment() {
    if (!viewId || !id || !secret) return
    setSavingComment(true)
    setError(null)
    try {
      const res = await fetch(`/api/survey/review/${viewId}/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': secret },
        body: JSON.stringify({ comment }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || 'Could not save note')
        return
      }
      setSavedComment(comment)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSavingComment(false)
    }
  }

  // ── Password gate ───────────────────────────────────────────────
  if (!secret) {
    return (
      <Page hideHeader hideFooter>
        <Head>
          <title>Survey Review</title>
        </Head>
        <div className={`min-h-[70vh] flex items-center justify-center ${PAGE_BG} py-16`}>
          <form onSubmit={submitSecret} className={`${CARD} p-8 max-w-[520px] w-full mx-4 flex flex-col gap-4`}>
            <h1 className="text-2xl font-extrabold text-[#160b2b]">Survey Review</h1>
            <p className="text-sm text-[#594d73]">Enter the builder review password to view this survey response.</p>
            <div className="flex items-center border border-[#dddae2] rounded-lg focus-within:border-[#7235ed]">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secretInput}
                onChange={e => setSecretInput(e.target.value)}
                placeholder="Builder review password"
                className="h-11 flex-1 min-w-0 px-4 bg-transparent rounded-lg font-mono text-sm outline-none"
                autoComplete="current-password"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSecret(v => !v)}
                className="px-3 text-[#594d73] hover:text-[#160b2b]"
                aria-label={showSecret ? 'Hide password' : 'Show password'}
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              className="h-11 bg-[#7235ed] text-white font-bold rounded-full hover:bg-[#6029d1] transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
      </Page>
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
      <div className={`min-h-[80vh] ${PAGE_BG} py-4 px-4`}>
        <div className="max-w-[820px] mx-auto flex flex-col gap-6">
          {loading && !record && (
            <div className="flex items-center gap-2 text-[#594d73]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {record && (
            <>
              {nav.total > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#594d73]">
                    Response {nav.position} of {nav.total}
                    <span className="hidden sm:inline text-[#9b93ad]"> · use ← → keys</span>
                    {loading && (
                      <span className="inline-flex items-center gap-1.5 ml-2 align-[-4px] px-2.5 py-1 rounded-full bg-[#7235ed] text-white text-xs font-bold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Loading…
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <NavButton href={nav.prevId != null ? `${base}/${nav.prevId}` : null}>
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </NavButton>
                    <NavButton href={nav.nextId != null ? `${base}/${nav.nextId}` : null}>
                      Next <ChevronRight className="w-4 h-4" />
                    </NavButton>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className={`${CARD} p-6 flex flex-col gap-4`}>
                <div className="flex flex-col gap-1">
                  {survey && (
                    <span className="text-xs font-bold uppercase tracking-wide text-[#7235ed]">{survey.title}</span>
                  )}
                  <h1 className="text-2xl font-extrabold text-[#160b2b]">{name || `Response #${id}`}</h1>
                  <p className="text-sm text-[#594d73]">
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
                      className="mt-1 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[#7235ed] hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" /> Open in NocoDB
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {role && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#160b2b] text-white text-sm font-bold">
                      {role}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] text-[#7235ed] border border-[#decffb] text-sm font-bold">
                    {answeredCount} of {answerable.length} answered
                  </span>
                  {avgRating != null && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff8e6] text-[#9a6b00] border border-[#f0dca8] text-sm font-bold">
                      <Star className="w-4 h-4 fill-current" aria-hidden="true" /> Avg rating {avgRating.toFixed(1)}/5
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
                      className="w-full px-3 py-2 border border-[#dddae2] bg-[#f9f8fa] focus:bg-white rounded-lg text-sm text-[#160b2b] leading-5 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7235ed]/30"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={saveComment}
                        disabled={savingComment || comment === savedComment}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#160b2b] text-white text-sm font-semibold hover:bg-[#2d1a55] disabled:opacity-50 transition-colors"
                      >
                        {savingComment && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                        Save note
                      </button>
                      {comment !== savedComment ? (
                        <span className="text-xs text-[#a86510]">Unsaved changes</span>
                      ) : savedComment ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#137a3e]">
                          <Check className="w-3.5 h-3.5" aria-hidden="true" /> Saved
                        </span>
                      ) : null}
                    </div>
                  </Section>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-[#594d73] w-fit cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideUnanswered}
                  onChange={e => setHideUnanswered(e.target.checked)}
                  className="accent-[#7235ed]"
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
                      {g.intro && <p className="text-xs text-[#594d73] leading-5 -mt-1">{g.intro}</p>}
                      <div className="flex flex-col divide-y divide-[#efecf3]">
                        {visible.map(f => (
                          <div key={f.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                            <p className="text-sm font-bold text-[#160b2b]">{f.title}</p>
                            <AnswerValue field={f} value={record[f.column_name]} />
                          </div>
                        ))}
                      </div>
                    </Section>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </Page>
  )
}
