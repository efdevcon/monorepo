import React, { useState } from 'react'
import Head from 'next/head'
import Page from 'components/common/layouts/page'
import type { FormField } from 'services/nocodb-meta'
import { Check, X, Star, ExternalLink, Eye, EyeOff, Paperclip } from 'lucide-react'

// Shared pieces of the survey review pages (pages/survey-review/*): card
// styles, the password gate, and how each kind of answer is drawn.

export const CARD =
  'bg-[var(--sr-card)] border border-[var(--sr-card-line)] rounded-2xl shadow-[0_1px_2px_rgba(22,11,43,0.05),0_4px_12px_-6px_rgba(22,11,43,0.06)]'
// Every color on the survey pages is a --sr-* variable, so the pages follow
// the viewer's light/dark device setting. The rest of devcon.org has no dark
// mode, so this is scoped to the .sr-theme wrapper.
const THEME_CSS = `
.sr-theme {
  --sr-page: #f5f3f9; --sr-card: #ffffff; --sr-soft: #f9f8fa; --sr-chip: #f1eff4;
  --sr-ink: #160b2b; --sr-ink-hover: #2d1a55; --sr-body: #3b3450; --sr-muted: #594d73; --sr-faint: #9b93ad;
  --sr-disabled: #c4bdd1; --sr-line: #dddae2; --sr-line-soft: #eeeeee; --sr-card-line: #e5e1ed; --sr-divider: #efecf3;
  --sr-accent: #7235ed; --sr-accent-hover: #6029d1; --sr-accent-bg: #f3f0ff; --sr-accent-line: #decffb;
  --sr-accent-ring: rgba(114, 53, 237, 0.3); --sr-on-strong: #ffffff;
  --sr-good: #137a3e; --sr-good-bg: #e6f7ed; --sr-good-line: #b7e6c9; --sr-warn: #a86510; --sr-bad: #dc2626;
  --sr-gold: #9a6b00; --sr-gold-bg: #fff8e6; --sr-gold-line: #f0dca8; --sr-star: #f5b301;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  .sr-theme {
    --sr-page: #120c1e; --sr-card: #1b1429; --sr-soft: #221a33; --sr-chip: #2a2140;
    --sr-ink: #f2eefa; --sr-ink-hover: #d9d1ea; --sr-body: #d4cde3; --sr-muted: #a79dbd; --sr-faint: #7a7091;
    --sr-disabled: #4a4062; --sr-line: #3a3052; --sr-line-soft: #2c2340; --sr-card-line: #2e2544; --sr-divider: #2c2340;
    --sr-accent: #a98bff; --sr-accent-hover: #bfa8ff; --sr-accent-bg: #2a1f4a; --sr-accent-line: #43347a;
    --sr-accent-ring: rgba(169, 139, 255, 0.35); --sr-on-strong: #160b2b;
    --sr-good: #6fd69a; --sr-good-bg: #13301f; --sr-good-line: #22573a; --sr-warn: #f0b765; --sr-bad: #f08c8e;
    --sr-gold: #f0c860; --sr-gold-bg: #33280f; --sr-gold-line: #5c4a19; --sr-star: #f5c33b;
    color-scheme: dark;
  }
}
`

/** Loads the survey pages' light and dark colors. Render once per page. */
export function SurveyTheme() {
  return <style>{THEME_CSS}</style>
}

/** Page background and default text color; add to each page's outer wrapper. */
export const PAGE_BG = 'sr-theme min-h-screen bg-[var(--sr-page)] text-[var(--sr-ink)]'

interface Attachment {
  title?: string
  mimetype?: string
  signedUrl?: string
  url?: string
}

/** Unanswered, per field type: NocoDB stores a skipped rating as 0. */
export function isUnanswered(field: FormField, v: unknown): boolean {
  if (field.uidt === 'Rating') return !(Number(v) > 0)
  return isEmpty(v)
}

export function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

/** Section blocks are markdown: the first line is the heading, the rest an intro. */
export function parseSection(md: string): { title: string; intro: string } {
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

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--sr-muted)]">{title}</h2>
      {children}
    </div>
  )
}

const PILL = 'inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--sr-chip)] text-[var(--sr-body)] text-sm'

/** One answer, drawn according to the NocoDB column type. */
export function AnswerValue({ field, value }: { field: FormField; value: unknown }) {
  if (field.uidt === 'Checkbox') {
    return value ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sr-good-bg)] text-[var(--sr-good)] border border-[var(--sr-good-line)] text-sm font-bold w-fit">
        <Check className="w-4 h-4" aria-hidden="true" /> Yes
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sr-chip)] text-[var(--sr-muted)] border border-[var(--sr-line)] text-sm font-bold w-fit">
        <X className="w-4 h-4" aria-hidden="true" /> No
      </span>
    )
  }

  if (isUnanswered(field, value)) return <p className="text-sm italic text-[var(--sr-faint)]">No answer</p>

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
                className={`w-5 h-5 ${i < n ? 'fill-[var(--sr-star)] text-[var(--sr-star)]' : 'text-[var(--sr-line)]'}`}
                aria-hidden="true"
              />
            ))}
          </span>
          <span className="text-sm font-bold text-[var(--sr-ink)]">
            {n}/{max}
          </span>
        </div>
      )
    }
    case 'SingleSelect':
      return (
        <span className="inline-flex w-fit px-3 py-1 rounded-full bg-[var(--sr-accent-bg)] text-[var(--sr-accent)] border border-[var(--sr-accent-line)] text-sm font-bold">
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
      return <p className="text-sm text-[var(--sr-body)]">{new Date(String(value)).toLocaleDateString()}</p>
    case 'Email':
      return (
        <a
          href={`mailto:${String(value)}`}
          className="text-sm font-medium text-[var(--sr-accent)] hover:underline w-fit"
        >
          {String(value)}
        </a>
      )
    case 'URL':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--sr-accent)] hover:underline w-fit break-all"
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--sr-line)] bg-[var(--sr-soft)] text-sm text-[var(--sr-ink)] hover:opacity-80"
              >
                <Paperclip className="w-4 h-4 text-[var(--sr-accent)]" aria-hidden="true" />
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
          <pre className="text-xs text-[var(--sr-body)] bg-[var(--sr-soft)] rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        )
      }
      return <p className="text-sm text-[var(--sr-body)] leading-6 whitespace-pre-line">{String(value)}</p>
  }
}

/** Full-page password prompt, shared by the survey review pages. */
export function SurveyPasswordGate({
  error,
  onUnlock,
}: {
  error: string | null
  onUnlock: (password: string) => void
}) {
  const [secretInput, setSecretInput] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const k = secretInput.trim()
    if (k) onUnlock(k)
  }

  return (
    <Page hideHeader hideFooter>
      <Head>
        <title>Survey Review</title>
      </Head>
      <SurveyTheme />
      <div className={`flex items-center justify-center ${PAGE_BG} py-16`}>
        <form onSubmit={submit} className={`${CARD} p-8 max-w-[520px] w-full mx-4 flex flex-col gap-4`}>
          <h1 className="text-2xl font-extrabold text-[var(--sr-ink)]">Survey Review</h1>
          <p className="text-sm text-[var(--sr-muted)]">Enter the builder review password to view survey responses.</p>
          <div className="flex items-center border border-[var(--sr-line)] rounded-lg focus-within:border-[var(--sr-accent)]">
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
              className="px-3 text-[var(--sr-muted)] hover:text-[var(--sr-ink)]"
              aria-label={showSecret ? 'Hide password' : 'Show password'}
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-sm text-[var(--sr-bad)]">{error}</p>}
          <button
            type="submit"
            className="h-11 bg-[var(--sr-accent)] text-[var(--sr-on-strong)] font-bold rounded-full hover:bg-[var(--sr-accent-hover)] transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    </Page>
  )
}
