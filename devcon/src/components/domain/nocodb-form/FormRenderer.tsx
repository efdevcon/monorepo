import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ChevronDown,
  X,
  FileText,
  Download,
  ExternalLink,
  Lock,
  ShieldCheck,
  Star,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { COUNTRIES } from './countries'
import { renderInlineMarkdown } from './inline-markdown'
import { supabase } from 'services/supabase-browser'
import { AGE_RECIPIENTS, isEncryptedTitle, stripEncryptedPrefix } from 'config/encrypted-forms'
import { packEnvelope } from 'utils/age-envelope'
import { rhfFieldName } from './rhf-key'

export interface FormColumn {
  // NocoDB column id (e.g. "ca5053xfrug7k1d"). Optional for back-compat —
  // older schema responses may omit it. Required for conditional-rule
  // matching (rules reference columns by id, not name).
  id?: string
  title: string
  column_name: string
  uidt: string
  required: boolean
  description?: string
  options?: string[]
  // Rating-only: icon count + fill color (see FormField in nocodb-meta.ts).
  rating?: { max: number; color?: string }
}

export interface ConditionalRule {
  targetColumnId: string
  sourceColumnId: string
  op: string
  value: string | null
  logicalOp: 'and' | 'or'
  enabled: boolean
}

// Evaluator for one rule, against a current form value. Handles the ops the
// NocoDB form view UI actually exposes. Unknown ops fail closed (rule does
// not match) so a future NocoDB op never accidentally shows a field.
function evaluateRule(op: string, current: unknown, ruleValue: string | null): boolean {
  const currentStr = current == null ? '' : String(current)
  const isEmpty = current == null || currentStr === ''
  switch (op) {
    case 'eq':
      return currentStr === (ruleValue ?? '')
    case 'neq':
      return currentStr !== (ruleValue ?? '')
    case 'null':
    case 'empty':
    case 'blank':
      return isEmpty
    case 'notnull':
    case 'notempty':
    case 'notblank':
      return !isEmpty
    case 'anyof': {
      if (ruleValue == null) return false
      const values = ruleValue.split(',').map(v => v.trim())
      if (Array.isArray(current)) return current.some(c => values.includes(String(c)))
      return values.includes(currentStr)
    }
    case 'allof': {
      if (ruleValue == null) return false
      const values = ruleValue.split(',').map(v => v.trim())
      if (Array.isArray(current)) {
        const cs = current.map(String)
        return values.every(v => cs.includes(v))
      }
      return values.length === 1 && values[0] === currentStr
    }
    case 'like':
      return ruleValue != null && currentStr.toLowerCase().includes(ruleValue.toLowerCase())
    case 'nlike':
      return ruleValue != null && !currentStr.toLowerCase().includes(ruleValue.toLowerCase())
    case 'gt':
      return ruleValue != null && Number(currentStr) > Number(ruleValue)
    case 'gte':
      return ruleValue != null && Number(currentStr) >= Number(ruleValue)
    case 'lt':
      return ruleValue != null && Number(currentStr) < Number(ruleValue)
    case 'lte':
      return ruleValue != null && Number(currentStr) <= Number(ruleValue)
    default:
      return false
  }
}

const CHAR_LIMITS: Record<string, number> = {
  SingleLineText: 255,
  Email: 255,
  LongText: 1000,
}

// Explicit opt-in marker: a form field whose label starts with "Country:"
// (e.g. "Country:What is your origin country?") is rendered as a searchable
// country <select>, with the marker stripped from the visible label. This
// lets designers opt a field in regardless of its NocoDB type or wording —
// country fields are sometimes modelled as a SingleSelect with no options
// (designer expecting us to supply the list) or as plain text. Mirrors the
// existing `[encrypted]` title-prefix convention.
const COUNTRY_PREFIX = 'country:'

// Legacy exact-title matches, kept so forms that pre-date the prefix
// convention (e.g. the student-application "Country" field) keep working.
const COUNTRY_FIELD_NAMES = new Set(['country', 'country of residence', 'nationality'])

function isCountryField(col: FormColumn): boolean {
  // NocoDB has two name slots: the underlying column title (→ `column_name`,
  // our submission key) and the form-view label override (→ `title`, the
  // displayed text). A designer may add the `Country:` marker to either, so
  // check both. The legacy exact-name match only applies to the display title.
  const title = col.title.trim().toLowerCase()
  const colName = (col.column_name || '').trim().toLowerCase()
  return title.startsWith(COUNTRY_PREFIX) || colName.startsWith(COUNTRY_PREFIX) || COUNTRY_FIELD_NAMES.has(title)
}

// Strips the `Country:` opt-in marker from a title for display. No-op for
// titles that don't carry it.
function stripCountryPrefix(title: string): string {
  const trimmed = title.trimStart()
  if (trimmed.toLowerCase().startsWith(COUNTRY_PREFIX)) {
    return trimmed.slice(COUNTRY_PREFIX.length).trimStart()
  }
  return title
}

interface FormRendererProps {
  columns: FormColumn[]
  readOnlyFields?: string[]
  hiddenFields?: string[]
  viewId: string
  conditionalRules?: ConditionalRule[]
}

const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,image/png,image/jpeg,image/webp'

interface NocoAttachment {
  url?: string
  path?: string
  signedPath?: string
  title: string
  mimetype: string
  size: number
}

function formatSize(bytes: number): string {
  if (!bytes || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function attachmentProxyUrl(a: NocoAttachment): string | null {
  // Prefer absolute signed URLs, then NocoDB's `dltemp/...` signed path. Raw
  // `download/...` paths are not lent through the proxy (no token sharing).
  const params = new URLSearchParams()
  if (a.url) params.set('url', a.url)
  else if (a.signedPath) params.set('path', a.signedPath)
  else return null
  if (a.title) params.set('filename', a.title)
  return `/api/nocodb/file/?${params.toString()}`
}

function AttachmentPreview({ attachment, onRemove }: { attachment: NocoAttachment; onRemove?: () => void }) {
  const fileUrl = attachmentProxyUrl(attachment)
  const isImage = attachment.mimetype?.startsWith('image/')

  return (
    <li className="flex items-center gap-3 px-3 py-2 bg-[#f9f8fa] border border-[#dddae2] rounded-md text-sm">
      <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-white border border-[#dddae2] rounded overflow-hidden">
        {isImage && fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt={attachment.title} className="w-full h-full object-cover" />
        ) : (
          <FileText className="w-5 h-5 text-[#594d73]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[#160b2b]">{attachment.title}</p>
        {attachment.size > 0 && <p className="text-xs text-[#594d73]">{formatSize(attachment.size)}</p>}
      </div>

      {fileUrl && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-1.5 text-[#594d73] hover:text-[#7235ed]"
          aria-label={`Open ${attachment.title}`}
          title="Open / download"
        >
          {isImage || attachment.mimetype === 'application/pdf' ? (
            <ExternalLink className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </a>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 p-1.5 text-[#594d73] hover:text-[#b42124]"
          aria-label={`Remove ${attachment.title}`}
          title="Remove"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </li>
  )
}

function AttachmentField({ col, viewId, isReadOnly }: { col: FormColumn; viewId: string; isReadOnly: boolean }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  // RHF parses `[...]` and `.` as path syntax — register under a safe alias
  // and let FormPage remap to the original column name on submit.
  const rhfKey = rhfFieldName(col.column_name)

  useEffect(() => {
    register(rhfKey, {
      validate: v => {
        if (!col.required) return true
        return (Array.isArray(v) && v.length > 0) || `${col.title} is required`
      },
    })
  }, [register, rhfKey, col.required, col.title])

  // NocoDB sometimes returns attachments as a JSON-encoded string on read; normalize.
  const rawAttachments = watch(rhfKey)
  const attachments: NocoAttachment[] = Array.isArray(rawAttachments)
    ? rawAttachments
    : typeof rawAttachments === 'string'
    ? (() => {
        try {
          return JSON.parse(rawAttachments)
        } catch {
          return []
        }
      })()
    : []
  const hasFiles = attachments.length > 0
  const fieldError = errors[rhfKey]
  const errorMessage = uploadError || (fieldError?.message as string | undefined)

  const handlePick = () => inputRef.current?.click()

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    setUploadError('')
    for (const file of files) {
      if (file.size > ATTACHMENT_MAX_BYTES) {
        setUploadError(`"${file.name}" is too large (max 10MB)`)
        return
      }
    }

    setUploading(true)
    try {
      const headers: Record<string, string> = {}
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }

      const uploaded: NocoAttachment[] = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('files', file)

        const res = await fetch(
          `/api/nocodb/${viewId}/upload-attachment/?column=${encodeURIComponent(col.column_name)}`,
          { method: 'POST', headers, body: formData }
        )
        const result = await res.json()
        if (!res.ok || !result.success) throw new Error(result.error || 'Upload failed')
        if (Array.isArray(result.attachments)) uploaded.push(...result.attachments)
      }

      setValue(rhfKey, [...attachments, ...uploaded], { shouldValidate: true })
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = (idx: number) => {
    const next = attachments.filter((_, i) => i !== idx)
    setValue(rhfKey, next, { shouldValidate: true })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <FieldLabel title={col.title} required={col.required} />
        {col.description && <FieldDescription text={col.description} />}
      </div>

      <button
        type="button"
        onClick={handlePick}
        disabled={uploading || isReadOnly}
        className="flex items-center gap-3 w-full px-4 py-2.5 bg-white border border-[#dddae2] rounded-lg text-sm text-left disabled:opacity-50 hover:border-[rgba(34,17,68,0.2)] transition-colors min-w-0"
      >
        <span className="font-medium text-[#7235ed] shrink-0">{hasFiles ? 'Add more' : 'Choose file(s)'}</span>
        <span className="text-[#594d73] truncate">{uploading ? 'Uploading…' : 'PDF, DOC, PNG, JPG up to 10MB'}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        multiple
        onChange={handleChange}
        className="hidden"
      />

      {hasFiles && (
        <ul className="flex flex-col gap-2">
          {attachments.map((a, idx) => (
            <AttachmentPreview
              key={`${a.title}-${idx}`}
              attachment={a}
              onRemove={isReadOnly ? undefined : () => handleRemove(idx)}
            />
          ))}
        </ul>
      )}

      {errorMessage && <FieldError message={errorMessage} />}
    </div>
  )
}

interface EncryptedLocalMeta {
  filename: string
  size: number
  mimetype: string
}

function EncryptedAttachmentField({
  col,
  viewId,
  isReadOnly,
}: {
  col: FormColumn
  viewId: string
  isReadOnly: boolean
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  // Track the original (pre-encryption) filename of the file uploaded in this
  // session, so the user sees "passport.pdf" instead of the opaque ".age" name.
  // Not persisted — on revisit, only the opaque name is available.
  const [localMeta, setLocalMeta] = useState<EncryptedLocalMeta | null>(null)
  // RHF strips `[...]` from field names; use a sanitized alias and let
  // FormPage remap to the original column name at submit time.
  const rhfKey = rhfFieldName(col.column_name)
  const displayTitle = stripEncryptedPrefix(col.title)

  useEffect(() => {
    register(rhfKey, {
      validate: v => {
        if (!col.required) return true
        return (Array.isArray(v) && v.length > 0) || `${displayTitle} is required`
      },
    })
  }, [register, rhfKey, col.required, displayTitle])

  const rawAttachments = watch(rhfKey)
  const attachments: NocoAttachment[] = Array.isArray(rawAttachments)
    ? rawAttachments
    : typeof rawAttachments === 'string'
    ? (() => {
        try {
          return JSON.parse(rawAttachments)
        } catch {
          return []
        }
      })()
    : []
  const current = attachments[0]
  const fieldError = errors[rhfKey]
  const errorMessage = uploadError || (fieldError?.message as string | undefined)

  const handlePick = () => inputRef.current?.click()

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadError('')
    if (file.size > ATTACHMENT_MAX_BYTES) {
      setUploadError(`"${file.name}" is too large (max 10MB)`)
      return
    }

    setUploading(true)
    try {
      // Lazy-load the age library so the ~30KB of crypto code only ships when
      // a user actually opens an encrypted form.
      const ageModule = await import('age-encryption')
      const encrypter = new ageModule.Encrypter()
      for (const r of AGE_RECIPIENTS) encrypter.addRecipient(r)

      const fileBytes = new Uint8Array(await file.arrayBuffer())
      const envelope = packEnvelope(
        {
          filename: file.name,
          mimetype: file.type || 'application/octet-stream',
          size: file.size,
          encryptedAt: new Date().toISOString(),
        },
        fileBytes
      )
      const ciphertext = await encrypter.encrypt(envelope)

      // Opaque on-disk name — leaks nothing about the submitter or file.
      const opaqueName = `${crypto.randomUUID()}.age`
      // Standalone Uint8Array so Blob doesn't see a shared ArrayBuffer.
      const blobBytes = new Uint8Array(ciphertext.byteLength)
      blobBytes.set(ciphertext)
      const blob = new Blob([blobBytes], { type: 'application/octet-stream' })

      const headers: Record<string, string> = {}
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }

      const formData = new FormData()
      formData.append('files', blob, opaqueName)
      const res = await fetch(
        `/api/nocodb/${viewId}/upload-attachment/?column=${encodeURIComponent(col.column_name)}`,
        { method: 'POST', headers, body: formData }
      )
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || 'Upload failed')
      if (!Array.isArray(result.attachments) || result.attachments.length === 0) {
        throw new Error('Upload returned no attachment')
      }

      setLocalMeta({ filename: file.name, size: file.size, mimetype: file.type || 'application/octet-stream' })
      // Encrypted field is single-file: replace, don't append.
      setValue(rhfKey, result.attachments.slice(0, 1), { shouldValidate: true })
    } catch (err) {
      console.error('[encrypted-upload]', err)
      setUploadError((err as Error).message || 'Encryption or upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setLocalMeta(null)
    setValue(rhfKey, [], { shouldValidate: true })
  }

  const blobUrl = current ? attachmentProxyUrl(current) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-base font-bold text-[#160b2b] leading-6 flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-[#7235ed]" aria-hidden="true" />
          {displayTitle}
          {col.required && <span className="text-[#b42124] ml-0.5">*</span>}
        </label>
        {col.description && <FieldDescription text={col.description} />}
        <p className="text-xs text-[#594d73] flex items-start gap-1.5 leading-5">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#7235ed]" aria-hidden="true" />
          <span>
            Encrypted in your browser before upload. Only the visa team can decrypt this file — our servers and backups
            never see its contents.
          </span>
        </p>
      </div>

      {!current ? (
        <button
          type="button"
          onClick={handlePick}
          disabled={uploading || isReadOnly}
          className="flex items-center gap-3 w-full px-4 py-2.5 bg-white border border-[#dddae2] rounded-lg text-sm text-left disabled:opacity-50 hover:border-[rgba(34,17,68,0.2)] transition-colors min-w-0"
        >
          <span className="font-medium text-[#7235ed] shrink-0">Choose file</span>
          <span className="text-[#594d73] truncate">
            {uploading ? 'Encrypting & uploading…' : 'PDF, DOC, PNG, JPG up to 10MB'}
          </span>
        </button>
      ) : (
        <ul className="flex flex-col gap-2">
          <li className="flex items-center gap-3 px-3 py-2 bg-[#f9f8fa] border border-[#dddae2] rounded-md text-sm">
            <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-white border border-[#dddae2] rounded">
              <Lock className="w-5 h-5 text-[#7235ed]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[#160b2b]">{localMeta?.filename || 'Encrypted file'}</p>
              <p className="text-xs text-[#594d73]">
                {localMeta
                  ? `${formatSize(localMeta.size)} · encrypted ✓`
                  : `${formatSize(current.size)} · encrypted ✓`}
              </p>
            </div>
            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 text-[#594d73] hover:text-[#7235ed]"
                aria-label="Download encrypted blob"
                title="Download encrypted blob (.age)"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleRemove}
                className="shrink-0 p-1.5 text-[#594d73] hover:text-[#b42124]"
                aria-label="Remove file"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </li>
        </ul>
      )}

      <input ref={inputRef} type="file" accept={ATTACHMENT_ACCEPT} onChange={handleChange} className="hidden" />

      {errorMessage && <FieldError message={errorMessage} />}
    </div>
  )
}

function MultiSelectField({ col, isReadOnly }: { col: FormColumn; isReadOnly: boolean }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()
  const rhfKey = rhfFieldName(col.column_name)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    register(rhfKey, {
      validate: v => {
        if (!col.required) return true
        return (Array.isArray(v) && v.length > 0) || `${col.title} is required`
      },
    })
  }, [register, rhfKey, col.required, col.title])

  // RHF may hand us the raw NocoDB comma-separated string on first load (before
  // FormPage's normalisation runs) — accept either shape.
  const raw = watch(rhfKey)
  const selected: string[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string' && raw.length > 0
    ? raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : []

  const options = col.options ?? []
  const fieldError = errors[rhfKey]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]
    setValue(rhfKey, next, { shouldValidate: true })
  }

  const removeOption = (opt: string) => {
    setValue(
      rhfKey,
      selected.filter(s => s !== opt),
      { shouldValidate: true }
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <FieldLabel title={col.title} required={col.required} />
        {col.description && <FieldDescription text={col.description} />}
      </div>

      <div ref={containerRef} className="relative">
        <div
          role="button"
          tabIndex={isReadOnly ? -1 : 0}
          aria-disabled={isReadOnly}
          onClick={() => {
            if (!isReadOnly) setOpen(!open)
          }}
          onKeyDown={e => {
            if (isReadOnly) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen(!open)
            }
          }}
          style={{ border: '1px solid #dddae2' }}
          className={`flex items-center justify-between w-full min-h-10 px-3 py-1.5 text-base rounded-lg bg-white text-left ${
            isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {selected.length === 0 ? (
            <span className="text-[#594d73]">{`Select ${col.title.toLowerCase()}`}</span>
          ) : (
            <span className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {selected.map(s => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f3f0ff] text-[#7235ed] text-sm rounded-md"
                >
                  {s}
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        removeOption(s)
                      }}
                      className="hover:text-[#b42124]"
                      aria-label={`Remove ${s}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-[#594d73] shrink-0 ml-2" />
        </div>

        {open && (
          <div
            style={{
              border: '1px solid #dddae2',
              maxHeight: 280,
              position: 'absolute',
              zIndex: 50,
              marginTop: 4,
              width: '100%',
              background: 'white',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              overflowY: 'auto',
            }}
          >
            {options.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[#594d73]">No options</p>
            ) : (
              options.map(opt => {
                const isSelected = selected.includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleOption(opt)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#f3f0ff] ${
                      isSelected ? 'bg-[#f3f0ff] font-bold text-[#7235ed]' : 'text-[#160b2b]'
                    }`}
                  >
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                      {isSelected && <Check className="w-4 h-4" />}
                    </span>
                    <span>{opt}</span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {fieldError && <FieldError message={fieldError.message as string} />}
    </div>
  )
}

function CheckboxField({ col, isReadOnly }: { col: FormColumn; isReadOnly: boolean }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()
  const rhfKey = rhfFieldName(col.column_name)
  const checked = !!watch(rhfKey)
  const error = errors[rhfKey]

  useEffect(() => {
    register(rhfKey, {
      validate: v => (col.required ? v === true || `${col.title} is required` : true),
    })
  }, [register, rhfKey, col.required, col.title])

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          id={col.column_name}
          checked={checked}
          disabled={isReadOnly}
          onCheckedChange={val => setValue(rhfKey, val === true, { shouldValidate: true })}
          className="mt-0.5 shrink-0"
        />
        <span className="text-base text-[#160b2b] leading-6">
          {col.title}
          {col.required && <span className="text-[#b42124] ml-0.5">*</span>}
        </span>
      </label>
      {col.description && (
        <div className="pl-7">
          <FieldDescription text={col.description} />
        </div>
      )}
      {error && (
        <div className="pl-7">
          <FieldError message={error.message as string} />
        </div>
      )}
    </div>
  )
}

function RatingField({ col, isReadOnly }: { col: FormColumn; isReadOnly: boolean }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()
  const rhfKey = rhfFieldName(col.column_name)
  const error = errors[rhfKey]
  const max = col.rating?.max ?? 5
  const color = col.rating?.color || '#fcb401'
  const current = Number(watch(rhfKey)) || 0
  const [hovered, setHovered] = useState(0)

  // Register with a validate fn so `required` means "at least one star".
  useEffect(() => {
    register(rhfKey, {
      validate: v => (col.required ? Number(v) > 0 || `${col.title} is required` : true),
    })
  }, [register, rhfKey, col.required, col.title])

  const active = hovered || current

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <FieldLabel title={col.title} required={col.required} />
        {col.description && <FieldDescription text={col.description} />}
      </div>
      <div className="flex items-center gap-1.5" onMouseLeave={() => setHovered(0)}>
        {Array.from({ length: max }, (_, i) => {
          const value = i + 1
          const filled = value <= active
          return (
            <button
              key={value}
              type="button"
              disabled={isReadOnly}
              aria-label={`${value} of ${max}`}
              onMouseEnter={() => !isReadOnly && setHovered(value)}
              onClick={() =>
                // Click the current value again to clear it back to 0.
                setValue(rhfKey, current === value ? 0 : value, { shouldValidate: true })
              }
              className="p-0.5 disabled:cursor-not-allowed transition-transform hover:scale-110"
            >
              <Star className="w-7 h-7" style={{ color, fill: filled ? color : 'transparent' }} strokeWidth={1.5} />
            </button>
          )
        })}
      </div>
      {error && <FieldError message={error.message as string} />}
    </div>
  )
}

function FieldLabel({ title, required }: { title: string; required: boolean }) {
  return (
    <label className="text-base font-bold text-[#160b2b] leading-6">
      {title}
      {required && <span className="text-[#b42124] ml-0.5">*</span>}
    </label>
  )
}

function FieldDescription({ text }: { text: string }) {
  return <p className="text-sm text-[#594d73] leading-5 whitespace-pre-line">{renderInlineMarkdown(text)}</p>
}

function FieldError({ message }: { message: string }) {
  return <p className="text-sm text-red-500">{message}</p>
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (val: string) => void
  options: string[]
  placeholder: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())) : options

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(!open)
          if (!open) setTimeout(() => inputRef.current?.focus(), 0)
        }}
        style={{ border: '1px solid #dddae2' }}
        className="flex items-center justify-between w-full h-10 px-4 text-base rounded-lg bg-white text-left disabled:opacity-50"
      >
        <span className={value ? 'text-[#160b2b]' : 'text-[#594d73]'}>{value || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-[#594d73] shrink-0" />
      </button>

      {open && (
        <div
          style={{
            border: '1px solid #dddae2',
            maxHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            zIndex: 50,
            marginTop: 4,
            width: '100%',
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid #dddae2', flexShrink: 0 }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                border: '1px solid #dddae2',
                width: '100%',
                padding: '6px 12px',
                fontSize: 14,
                borderRadius: 6,
                outline: 'none',
                display: 'block',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[#594d73]">No results</p>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt)
                    setOpen(false)
                    setSearch('')
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f3f0ff] ${
                    opt === value ? 'bg-[#f3f0ff] font-bold text-[#7235ed]' : 'text-[#160b2b]'
                  }`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function FormRenderer({
  columns,
  readOnlyFields = [],
  hiddenFields = [],
  viewId,
  conditionalRules = [],
}: FormRendererProps) {
  const {
    register,
    setValue,
    watch,
    unregister,
    formState: { errors },
  } = useFormContext()

  // Build the set of column names that should be hidden right now based on
  // conditional rules. Subscribes to all watched form values so the set
  // recomputes every keystroke / selection change without an effect dance.
  const watchedValues = watch()
  const colIdToName = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of columns) if (c.id) m.set(c.id, c.column_name)
    return m
  }, [columns])

  const conditionallyHidden = new Set<string>()
  for (const col of columns) {
    if (!col.id) continue
    const rules = conditionalRules.filter(r => r.enabled && r.targetColumnId === col.id)
    if (rules.length === 0) continue
    const results = rules.map(r => {
      const sourceName = colIdToName.get(r.sourceColumnId)
      if (!sourceName) return false
      const currentValue = watchedValues[rhfFieldName(sourceName)]
      return evaluateRule(r.op, currentValue, r.value)
    })
    // Sibling rules sharing the same target combine via their `logicalOp`.
    // NocoDB's UI defaults to `and`; if any rule on a target says `or`, treat
    // the group as `or` (matches NocoDB's behaviour where all siblings share
    // the same logical op).
    const useOr = rules.some(r => r.logicalOp === 'or')
    const visible = useOr ? results.some(Boolean) : results.every(Boolean)
    if (!visible) conditionallyHidden.add(col.column_name)
  }

  // RHF defaults to `shouldUnregister: false`, so once a field has been
  // mounted its validator + value persist after it unmounts. For
  // conditionally-hidden fields that means a stale `required` rule blocks
  // `handleSubmit` silently when the user toggles a parent select. Drop the
  // registration and value whenever a field becomes hidden.
  const hiddenSnapshot = [...conditionallyHidden].sort().join('|')
  useEffect(() => {
    if (!hiddenSnapshot) return
    for (const name of hiddenSnapshot.split('|')) {
      unregister(rhfFieldName(name))
    }
  }, [hiddenSnapshot, unregister])

  return (
    <div className="flex flex-col gap-6 w-full">
      {columns.map(col => {
        if (hiddenFields.includes(col.column_name)) return null
        if (conditionallyHidden.has(col.column_name)) return null
        const isReadOnly = readOnlyFields.includes(col.column_name)
        // RHF parses `[...]` / `.` in field names — use a sanitized alias for
        // every register/setValue/watch/errors lookup; the original column
        // name is remapped back at submit time in FormPage.
        const rhfKey = rhfFieldName(col.column_name)
        const error = errors[rhfKey]

        if (col.uidt === 'Attachment') {
          if (isEncryptedTitle(col.title)) {
            return <EncryptedAttachmentField key={col.column_name} col={col} viewId={viewId} isReadOnly={isReadOnly} />
          }
          return <AttachmentField key={col.column_name} col={col} viewId={viewId} isReadOnly={isReadOnly} />
        }

        // Country fields → searchable dropdown
        if (isCountryField(col)) {
          const currentValue = watch(rhfKey) || ''
          const displayTitle = stripCountryPrefix(col.title)
          return (
            <div key={col.column_name} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <FieldLabel title={displayTitle} required={col.required} />
                {col.description && <FieldDescription text={col.description} />}
              </div>
              <SearchableSelect
                value={currentValue}
                onChange={val => setValue(rhfKey, val, { shouldValidate: true })}
                options={COUNTRIES}
                placeholder="Select a country"
                disabled={isReadOnly}
              />
              {col.required && (
                <input type="hidden" {...register(rhfKey, { required: `${displayTitle} is required` })} />
              )}
              {error && <FieldError message={error.message as string} />}
            </div>
          )
        }

        if (col.uidt === 'SingleLineText') {
          const max = CHAR_LIMITS.SingleLineText
          return (
            <div key={col.column_name} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <FieldLabel title={col.title} required={col.required} />
                {col.description && <FieldDescription text={col.description} />}
              </div>
              <Input
                id={col.column_name}
                maxLength={max}
                disabled={isReadOnly}
                className="h-10 px-4 text-base border-[#dddae2] rounded-lg"
                {...register(rhfKey, {
                  required: col.required ? `${col.title} is required` : false,
                  maxLength: { value: max, message: `Maximum ${max} characters` },
                })}
              />
              {error && <FieldError message={error.message as string} />}
            </div>
          )
        }

        if (col.uidt === 'Number') {
          return (
            <div key={col.column_name} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <FieldLabel title={col.title} required={col.required} />
                {col.description && <FieldDescription text={col.description} />}
              </div>
              <Input
                id={col.column_name}
                type="number"
                inputMode="numeric"
                step={1}
                disabled={isReadOnly}
                className="h-10 px-4 text-base border-[#dddae2] rounded-lg"
                {...register(rhfKey, {
                  required: col.required ? `${col.title} is required` : false,
                  // Coerce the string the input yields into a number (or
                  // undefined when blank) so the value written to NocoDB is
                  // numeric, not a string.
                  setValueAs: v => (v === '' || v == null ? undefined : Number(v)),
                  validate: v => v === undefined || !Number.isNaN(Number(v)) || `${col.title} must be a number`,
                })}
              />
              {error && <FieldError message={error.message as string} />}
            </div>
          )
        }

        if (col.uidt === 'Rating') {
          return <RatingField key={col.column_name} col={col} isReadOnly={isReadOnly} />
        }

        if (col.uidt === 'Email') {
          const max = CHAR_LIMITS.Email
          return (
            <div key={col.column_name} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <FieldLabel title={col.title} required={col.required} />
                {col.description && <FieldDescription text={col.description} />}
              </div>
              <Input
                id={col.column_name}
                type="email"
                maxLength={max}
                disabled={isReadOnly}
                className="h-10 px-4 text-base border-[#dddae2] rounded-lg"
                {...register(rhfKey, {
                  required: col.required ? `${col.title} is required` : false,
                  maxLength: { value: max, message: `Maximum ${max} characters` },
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                })}
              />
              {error && <FieldError message={error.message as string} />}
            </div>
          )
        }

        if (col.uidt === 'URL') {
          const max = CHAR_LIMITS.SingleLineText
          return (
            <div key={col.column_name} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <FieldLabel title={col.title} required={col.required} />
                {col.description && <FieldDescription text={col.description} />}
              </div>
              <Input
                id={col.column_name}
                type="url"
                inputMode="url"
                placeholder="https://"
                maxLength={max}
                disabled={isReadOnly}
                className="h-10 px-4 text-base border-[#dddae2] rounded-lg"
                {...register(rhfKey, {
                  required: col.required ? `${col.title} is required` : false,
                  maxLength: { value: max, message: `Maximum ${max} characters` },
                  pattern: {
                    // Permissive URL check: any scheme + non-space rest, or a
                    // bare domain ("example.com/path"). Matches what most users
                    // type without forcing them to prepend https://.
                    value: /^(?:[a-z][a-z0-9+.-]*:\/\/\S+|[\w-]+(?:\.[\w-]+)+(?:\/\S*)?)$/i,
                    message: 'Enter a valid URL',
                  },
                })}
              />
              {error && <FieldError message={error.message as string} />}
            </div>
          )
        }

        if (col.uidt === 'LongText') {
          const max = CHAR_LIMITS.LongText
          const val: string = watch(rhfKey) || ''
          return (
            <div key={col.column_name} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <FieldLabel title={col.title} required={col.required} />
                {col.description && <FieldDescription text={col.description} />}
              </div>
              <Textarea
                id={col.column_name}
                rows={5}
                maxLength={max}
                disabled={isReadOnly}
                className="px-4 py-3 text-base border-[#dddae2] rounded-lg min-h-[120px] resize-y"
                {...register(rhfKey, {
                  required: col.required ? `${col.title} is required` : false,
                  maxLength: { value: max, message: `Maximum ${max} characters` },
                })}
              />
              <p className={`text-xs text-right ${val.length >= max ? 'text-red-500' : 'text-[#594d73]'}`}>
                {val.length}/{max}
              </p>
              {error && <FieldError message={error.message as string} />}
            </div>
          )
        }

        if (col.uidt === 'Date') {
          return (
            <div key={col.column_name} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <FieldLabel title={col.title} required={col.required} />
                {col.description && <FieldDescription text={col.description} />}
              </div>
              <Input
                id={col.column_name}
                type="date"
                disabled={isReadOnly}
                // Open the native date picker on any click/focus, not just on
                // the small calendar icon. `showPicker()` is supported in
                // Chrome 99+, Firefox 101+, Safari 16+ — wrap in a try so we
                // degrade gracefully on older browsers.
                onClick={e => {
                  try {
                    ;(e.currentTarget as HTMLInputElement).showPicker?.()
                  } catch {}
                }}
                onFocus={e => {
                  try {
                    ;(e.currentTarget as HTMLInputElement).showPicker?.()
                  } catch {}
                }}
                className="h-10 px-4 text-base border-[#dddae2] rounded-lg cursor-pointer"
                {...register(rhfKey, {
                  required: col.required ? `${col.title} is required` : false,
                })}
              />
              {error && <FieldError message={error.message as string} />}
            </div>
          )
        }

        if (col.uidt === 'Checkbox') {
          return <CheckboxField key={col.column_name} col={col} isReadOnly={isReadOnly} />
        }

        if (col.uidt === 'MultiSelect' && col.options) {
          return <MultiSelectField key={col.column_name} col={col} isReadOnly={isReadOnly} />
        }

        if (col.uidt === 'SingleSelect' && col.options) {
          const currentValue = watch(rhfKey)
          return (
            <div key={col.column_name} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <FieldLabel title={col.title} required={col.required} />
                {col.description && <FieldDescription text={col.description} />}
              </div>
              <Select
                value={currentValue || ''}
                onValueChange={val => setValue(rhfKey, val, { shouldValidate: true })}
                disabled={isReadOnly}
              >
                <SelectTrigger id={col.column_name} className="h-10 px-4 text-base border-[#dddae2] rounded-lg">
                  <SelectValue placeholder={`Select ${col.title.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {col.options.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {col.required && (
                <input
                  type="hidden"
                  {...register(rhfKey, {
                    required: `${col.title} is required`,
                  })}
                />
              )}
              {error && <FieldError message={error.message as string} />}
            </div>
          )
        }

        return (
          <div key={col.column_name} className="flex flex-col gap-2">
            <FieldLabel title={col.title} required={col.required} />
            {col.description && <FieldDescription text={col.description} />}
            <div className="flex items-start gap-2 px-3 py-2 border border-red-300 bg-red-50 rounded-lg text-sm text-red-600">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Field type <code className="font-mono">{col.uidt}</code> is not currently supported.
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
