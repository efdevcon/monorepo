import React, { useState } from 'react'
import Head from 'next/head'
import Page from 'components/common/layouts/page'
import type { FormField } from 'services/nocodb-meta'
import { Check, X, Star, ExternalLink, Eye, EyeOff, Paperclip } from 'lucide-react'

// Shared pieces of the survey review pages (pages/survey-review/*): card
// styles, the password gate, and how each kind of answer is drawn.

export const CARD =
  'bg-white border border-[#e5e1ed] rounded-2xl shadow-[0_1px_2px_rgba(22,11,43,0.05),0_4px_12px_-6px_rgba(22,11,43,0.06)]'
export const PAGE_BG = 'bg-[#f5f3f9]'

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
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#594d73]">{title}</h2>
      {children}
    </div>
  )
}

const PILL = 'inline-flex items-center px-2.5 py-1 rounded-md bg-[#f1eff4] text-[#3b3450] text-sm'

/** One answer, drawn according to the NocoDB column type. */
export function AnswerValue({ field, value }: { field: FormField; value: unknown }) {
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
      <div className={`min-h-[70vh] flex items-center justify-center ${PAGE_BG} py-16`}>
        <form onSubmit={submit} className={`${CARD} p-8 max-w-[520px] w-full mx-4 flex flex-col gap-4`}>
          <h1 className="text-2xl font-extrabold text-[#160b2b]">Survey Review</h1>
          <p className="text-sm text-[#594d73]">Enter the builder review password to view survey responses.</p>
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
