import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { GithubConnectField } from './GithubConnectField'
import { WalletConnectField } from './WalletConnectField'
import { renderInlineMarkdown } from './inline-markdown'
import { supabase } from 'services/supabase-browser'
import { AGE_RECIPIENTS, isEncryptedTitle, stripEncryptedPrefix } from 'config/encrypted-forms'
import {
  isGithubTitle,
  isWalletTitle,
  stripWalletPrefix,
  parseScaleTitle,
  isVoiceTitle,
  stripVoicePrefix,
  isMemoryTitle,
  stripMemoryPrefix,
} from 'config/form-field-markers'
import { VoiceRecorder } from './VoiceRecorder'
import { MemoryClaimField, useMemoryCode } from './MemoryClaimField'
import { FormSubheading } from './FormSubheading'
import { useBuilderConnect } from 'context/BuilderConnectContext'
import { packEnvelope } from 'utils/age-envelope'
import { rhfFieldName } from './rhf-key'
import { SignaturePad, SignaturePadHandle } from './SignaturePad'
import { useBeforeSubmit } from './before-submit'

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
  // Select fields: NocoDB's "show as list" toggle → radio buttons / checkboxes.
  isList?: boolean
  // Markdown section header rendered above the field (see splitSectionBlock in nocodb-meta.ts).
  section?: string
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
// "[voice]" long-text fields: a couple of spoken minutes runs well past 1000 characters.
const VOICE_CHAR_LIMIT = 5000

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

// Attachment columns whose name mentions a signature (the youth form's
// "Parent/Guardian signature" / "Minor signature") get a draw-to-sign pad on
// top of the file picker. Checked on both name slots, like the Country marker.
function isSignatureField(col: FormColumn): boolean {
  const needle = 'signature'
  return col.title.toLowerCase().includes(needle) || (col.column_name || '').toLowerCase().includes(needle)
}

// Stable identity for an uploaded attachment across react-hook-form's value
// cloning (setValue deep-clones, so object identity can't be relied on).
function attachmentKey(a: NocoAttachment): string {
  return a.path || a.signedPath || a.url || a.title
}

// NocoDB sometimes returns attachments as a JSON-encoded string on read; normalize.
function parseAttachments(raw: unknown): NocoAttachment[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

// How long after the last pen-up a drawn signature waits before uploading, so
// a multi-stroke signature goes up once rather than per stroke.
const SIGNATURE_UPLOAD_DEBOUNCE_MS = 700

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
    getValues,
    watch,
    formState: { errors },
  } = useFormContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  // RHF parses `[...]` and `.` as path syntax — register under a safe alias
  // and let FormPage remap to the original column name on submit.
  const rhfKey = rhfFieldName(col.column_name)
  const signature = isSignatureField(col)

  useEffect(() => {
    register(rhfKey, {
      validate: v => {
        if (!col.required) return true
        return (Array.isArray(v) && v.length > 0) || `${col.title} is required`
      },
    })
  }, [register, rhfKey, col.required, col.title])

  const attachments = parseAttachments(watch(rhfKey))
  const hasFiles = attachments.length > 0
  const fieldError = errors[rhfKey]
  const errorMessage = uploadError || (fieldError?.message as string | undefined)

  const handlePick = () => inputRef.current?.click()

  // Upload `files` one by one through our proxy; resolves with NocoDB's
  // attachment records, throws on the first failure.
  const uploadFiles = useCallback(
    async (files: File[]): Promise<NocoAttachment[]> => {
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
      return uploaded
    },
    [viewId, col.column_name]
  )

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
      const uploaded = await uploadFiles(files)
      setValue(rhfKey, [...parseAttachments(getValues(rhfKey)), ...uploaded], { shouldValidate: true })
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  // ── Drawn signature ──
  // The pad hands over a fresh PNG after every stroke; uploads are debounced
  // and chained so the field always ends up holding exactly one pad-made
  // attachment (replacing the previous one). `undefined` = nothing pending,
  // `null` = pad cleared, File = drawing to upload.
  const padRef = useRef<SignaturePadHandle>(null)
  const pendingSignatureRef = useRef<File | null | undefined>(undefined)
  const signatureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const signatureInFlightRef = useRef<Promise<void> | null>(null)
  const padAttachmentKeyRef = useRef<string | null>(null)
  const [savingSignature, setSavingSignature] = useState(false)

  const flushSignature = useCallback(async () => {
    if (signatureTimerRef.current) {
      clearTimeout(signatureTimerRef.current)
      signatureTimerRef.current = null
    }
    const previous = signatureInFlightRef.current ?? Promise.resolve()
    const run = previous
      .catch(() => {})
      .then(async () => {
        const file = pendingSignatureRef.current
        if (file === undefined) return
        pendingSignatureRef.current = undefined
        const withoutPad = parseAttachments(getValues(rhfKey)).filter(
          a => attachmentKey(a) !== padAttachmentKeyRef.current
        )
        if (file === null) {
          padAttachmentKeyRef.current = null
          setValue(rhfKey, withoutPad, { shouldValidate: true })
          return
        }
        setSavingSignature(true)
        setUploadError('')
        try {
          const uploaded = await uploadFiles([file])
          padAttachmentKeyRef.current = uploaded[0] ? attachmentKey(uploaded[0]) : null
          setValue(rhfKey, [...withoutPad, ...uploaded], { shouldValidate: true })
        } catch (err) {
          setUploadError(`Could not save your signature: ${(err as Error).message}`)
          throw err
        } finally {
          setSavingSignature(false)
        }
      })
    signatureInFlightRef.current = run
    try {
      await run
    } finally {
      if (signatureInFlightRef.current === run) signatureInFlightRef.current = null
    }
  }, [getValues, setValue, rhfKey, uploadFiles])

  // Whatever is drawn must be uploaded before the form values are snapshotted.
  useBeforeSubmit(flushSignature)

  useEffect(
    () => () => {
      if (signatureTimerRef.current) clearTimeout(signatureTimerRef.current)
    },
    []
  )

  const handleSignatureChange = (file: File | null) => {
    pendingSignatureRef.current = file
    if (signatureTimerRef.current) clearTimeout(signatureTimerRef.current)
    signatureTimerRef.current = setTimeout(() => {
      signatureTimerRef.current = null
      flushSignature().catch(() => {})
    }, SIGNATURE_UPLOAD_DEBOUNCE_MS)
  }

  const handleRemove = (idx: number) => {
    const removed = attachments[idx]
    if (removed && attachmentKey(removed) === padAttachmentKeyRef.current) {
      padAttachmentKeyRef.current = null
      padRef.current?.clear({ silent: true })
    }
    const next = attachments.filter((_, i) => i !== idx)
    setValue(rhfKey, next, { shouldValidate: true })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <FieldLabel title={col.title} required={col.required} />
        {col.description && <FieldDescription text={col.description} />}
      </div>

      {signature && !isReadOnly && (
        <>
          <SignaturePad
            ref={padRef}
            onChange={handleSignatureChange}
            disabled={uploading}
            ariaLabel={`${col.title} drawing area`}
          />
          <div className="flex items-center gap-3 text-xs text-[#594d73]">
            <span className="h-px flex-1 bg-[#dddae2]" aria-hidden="true" />
            <span>or upload a file</span>
            <span className="h-px flex-1 bg-[#dddae2]" aria-hidden="true" />
          </div>
        </>
      )}

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

      {savingSignature && <p className="text-xs text-[#594d73]">Saving your signature…</p>}

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

  const selected = toSelectedList(watch(rhfKey))

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

// RHF may hand us the raw NocoDB comma-separated string on first load (before
// FormPage's normalisation runs) — accept either shape.
function toSelectedList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw === 'string' && raw.length > 0) {
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }
  return []
}

// SingleSelect shown as a radio list (NocoDB form option "show as list").
function RadioListField({ col, isReadOnly }: { col: FormColumn; isReadOnly: boolean }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()
  const rhfKey = rhfFieldName(col.column_name)
  const current = (watch(rhfKey) as string | undefined) || ''
  const error = errors[rhfKey]

  useEffect(() => {
    register(rhfKey, {
      validate: v => (col.required ? (typeof v === 'string' && v.length > 0) || `${col.title} is required` : true),
    })
  }, [register, rhfKey, col.required, col.title])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <FieldLabel title={col.title} required={col.required} />
        {col.description && <FieldDescription text={col.description} />}
      </div>
      <RadioGroup
        value={current}
        onValueChange={val => setValue(rhfKey, val, { shouldValidate: true })}
        disabled={isReadOnly}
        className="gap-2"
      >
        {(col.options ?? []).map((opt, i) => {
          const id = `${rhfKey}-opt-${i}`
          return (
            <label key={opt} htmlFor={id} className="flex items-start gap-3 cursor-pointer">
              <RadioGroupItem id={id} value={opt} className="mt-1 shrink-0" />
              <span className="text-base text-[#160b2b] leading-6">{opt}</span>
            </label>
          )
        })}
      </RadioGroup>
      {error && <FieldError message={error.message as string} />}
    </div>
  )
}

// MultiSelect shown as a checkbox list (NocoDB form option "show as list").
function CheckboxListField({ col, isReadOnly }: { col: FormColumn; isReadOnly: boolean }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()
  const rhfKey = rhfFieldName(col.column_name)
  const selected = toSelectedList(watch(rhfKey))
  const error = errors[rhfKey]

  useEffect(() => {
    register(rhfKey, {
      validate: v => {
        if (!col.required) return true
        return (Array.isArray(v) && v.length > 0) || `${col.title} is required`
      },
    })
  }, [register, rhfKey, col.required, col.title])

  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]
    setValue(rhfKey, next, { shouldValidate: true })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <FieldLabel title={col.title} required={col.required} />
        {col.description && <FieldDescription text={col.description} />}
      </div>
      <div className="flex flex-col gap-2">
        {(col.options ?? []).map((opt, i) => {
          const id = `${rhfKey}-opt-${i}`
          return (
            <label key={opt} htmlFor={id} className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                id={id}
                checked={selected.includes(opt)}
                disabled={isReadOnly}
                onCheckedChange={() => toggle(opt)}
                className="mt-1 shrink-0"
              />
              <span className="text-base text-[#160b2b] leading-6">{opt}</span>
            </label>
          )
        })}
      </div>
      {error && <FieldError message={error.message as string} />}
    </div>
  )
}

// Rating field flagged `[scale: Low | High]`: numbered buttons 1..max with the
// end labels underneath, the survey "linear scale" widget. Stored as the
// Rating number, so NocoDB still shows and aggregates it as a rating.
function ScaleField({
  col,
  isReadOnly,
  title,
  labels,
}: {
  col: FormColumn
  isReadOnly: boolean
  title: string
  labels?: [string, string]
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()
  const rhfKey = rhfFieldName(col.column_name)
  const error = errors[rhfKey]
  const max = col.rating?.max ?? 5
  const current = Number(watch(rhfKey)) || 0

  useEffect(() => {
    register(rhfKey, {
      validate: v => (col.required ? Number(v) > 0 || `${title} is required` : true),
    })
  }, [register, rhfKey, col.required, title])

  const [low, high] = labels ?? ['', '']

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <FieldLabel title={title} required={col.required} />
        {col.description && <FieldDescription text={col.description} />}
      </div>
      <div className="flex flex-col gap-2 w-fit max-w-full">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={title}>
          {Array.from({ length: max }, (_, i) => {
            const value = i + 1
            const selected = value === current
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={isReadOnly}
                // Click the current value again to clear it back to 0.
                onClick={() => setValue(rhfKey, selected ? 0 : value, { shouldValidate: true })}
                className={`h-11 min-w-11 px-3 rounded-lg border border-solid text-base font-semibold transition-colors disabled:cursor-not-allowed ${
                  selected
                    ? 'bg-[#7235ed] border-[#7235ed] text-white'
                    : 'bg-white border-[#dddae2] text-[#160b2b] hover:border-[#7235ed]'
                }`}
              >
                {value}
              </button>
            )
          })}
        </div>
        {(low || high) && (
          <div className="flex justify-between gap-6 text-sm text-[#594d73] leading-5">
            <span>{low}</span>
            <span className="text-right">{high}</span>
          </div>
        )}
      </div>
      {error && <FieldError message={error.message as string} />}
    </div>
  )
}

// Section header above the first field of a survey section: a rule and extra
// space before a `##` section, a lighter gap before a `###` sub-section.
function SectionHeader({ text, major }: { text: string; major: boolean }) {
  return (
    <div className={major ? 'pt-6 border-t border-solid border-[#dddae2]' : 'pt-2'}>
      <FormSubheading text={text} variant="section" />
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
  // data-field-error lets the form scroll to the first invalid field on submit
  // (works for every field type, incl. ones without a DOM <input name>).
  return (
    <p data-field-error className="text-sm text-red-500 scroll-mt-24">
      {message}
    </p>
  )
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
    getValues,
    watch,
    unregister,
    formState: { errors },
  } = useFormContext()
  // Auto-discount the applicant already qualifies for (builder form only; null
  // elsewhere). Rendered inside the Connections block once they connect.
  const { qualifyingDiscount } = useBuilderConnect()
  // A form with a [memory] field shows it, and its [wallet] field, only to a
  // visitor whose emailed link carries a known code (checked-in tickets only).
  const hasMemory = columns.some(c => isMemoryTitle(c.title))
  const memoryClaim = useMemoryCode(hasMemory)

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
        if (hasMemory && !memoryClaim && (isMemoryTitle(col.title) || isWalletTitle(col.title))) return null
        const isReadOnly = readOnlyFields.includes(col.column_name)
        // RHF parses `[...]` / `.` in field names — use a sanitized alias for
        // every register/setValue/watch/errors lookup; the original column
        // name is remapped back at submit time in FormPage.
        const rhfKey = rhfFieldName(col.column_name)
        const error = errors[rhfKey]

        const field = (() => {
          if (col.uidt === 'Attachment') {
            if (isEncryptedTitle(col.title)) {
              return (
                <EncryptedAttachmentField key={col.column_name} col={col} viewId={viewId} isReadOnly={isReadOnly} />
              )
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

          // GitHub + wallet render together as one "Connections" block (the GitHub
          // field owns the heading/helper; the wallet field collapses into it).
          if (isGithubTitle(col.title)) {
            const walletCol = columns.find(c => isWalletTitle(c.title))
            return (
              <div key={col.column_name} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <FieldLabel title="Connections" required={Boolean(col.required || walletCol?.required)} />
                  {col.description && <FieldDescription text={col.description} />}
                </div>
                <div className="flex flex-wrap gap-3">
                  <GithubConnectField columnName={col.column_name} label="" required={col.required} hideHeader />
                  {walletCol && (
                    <WalletConnectField
                      columnName={walletCol.column_name}
                      label=""
                      required={walletCol.required}
                      hideHeader
                    />
                  )}
                </div>
                {qualifyingDiscount && (
                  <div className="flex flex-col gap-1 rounded-xl border border-[#b7e6c9] bg-[#e6f7ed] p-4">
                    <p className="flex items-start gap-2 text-base font-bold text-[#137a3e]">
                      <Check className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        You qualify for{' '}
                        {qualifyingDiscount.discount >= 100
                          ? `a FREE ${qualifyingDiscount.name} ticket!`
                          : `${qualifyingDiscount.discount}% off via ${qualifyingDiscount.name}!`}
                      </span>
                    </p>
                    <p className="pl-7 text-sm text-[#3b3450] leading-5">
                      You don&apos;t need to apply — claim your ticket now at the{' '}
                      <a href="/en/tickets/store/#community" className="font-bold text-[#137a3e] underline">
                        ticket store
                      </a>
                      . Verify using the same GitHub / wallet and the discount will be detected automatically.
                    </p>
                  </div>
                )}
              </div>
            )
          }

          if (isWalletTitle(col.title)) {
            // Already rendered inside the combined Connections block above when a
            // GitHub field exists; otherwise render the wallet field on its own.
            if (columns.some(c => isGithubTitle(c.title))) return null
            return (
              <WalletConnectField
                key={col.column_name}
                columnName={col.column_name}
                label={stripWalletPrefix(col.title)}
                required={col.required}
                description={col.description}
              />
            )
          }

          // The Devcon 8 Memory card, minting to the form's [wallet] field.
          if (isMemoryTitle(col.title) && memoryClaim) {
            return (
              <div key={col.column_name} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <FieldLabel title={stripMemoryPrefix(col.title)} required={false} />
                  {col.description && <FieldDescription text={col.description} />}
                </div>
                <MemoryClaimField
                  columnName={col.column_name}
                  walletColumnName={columns.find(c => isWalletTitle(c.title))?.column_name}
                  claim={memoryClaim}
                />
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
            const scale = parseScaleTitle(col.title)
            if (scale) {
              return (
                <ScaleField
                  key={col.column_name}
                  col={col}
                  isReadOnly={isReadOnly}
                  title={scale.title}
                  labels={scale.labels}
                />
              )
            }
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
            const voice = isVoiceTitle(col.title)
            const label = voice ? stripVoicePrefix(col.title) : col.title
            const max = voice ? VOICE_CHAR_LIMIT : CHAR_LIMITS.LongText
            const val: string = watch(rhfKey) || ''
            return (
              <div key={col.column_name} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <FieldLabel title={label} required={col.required} />
                  {col.description && <FieldDescription text={col.description} />}
                </div>
                {voice && !isReadOnly && (
                  <VoiceRecorder
                    viewId={viewId}
                    onText={text => {
                      // Each take is appended to the text box, so a long answer can be
                      // spoken in parts; the cursor lands after it, ready to edit.
                      const current = String(getValues(rhfKey) || '').trimEnd()
                      const next = (current ? `${current} ${text}` : text).slice(0, max)
                      setValue(rhfKey, next, { shouldValidate: true, shouldDirty: true })
                      const box = document.getElementById(col.column_name)
                      if (box instanceof HTMLTextAreaElement) {
                        box.focus()
                        box.setSelectionRange(next.length, next.length)
                      }
                    }}
                  />
                )}
                <Textarea
                  id={col.column_name}
                  rows={5}
                  maxLength={max}
                  disabled={isReadOnly}
                  className="px-4 py-3 text-base border-[#dddae2] rounded-lg min-h-[120px] resize-y"
                  {...register(rhfKey, {
                    required: col.required ? `${label} is required` : false,
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
            if (col.isList) {
              return <CheckboxListField key={col.column_name} col={col} isReadOnly={isReadOnly} />
            }
            return <MultiSelectField key={col.column_name} col={col} isReadOnly={isReadOnly} />
          }

          if (col.uidt === 'SingleSelect' && col.options) {
            if (col.isList) {
              return <RadioListField key={col.column_name} col={col} isReadOnly={isReadOnly} />
            }
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
        })()

        // A section header travels with its first field, so a conditionally
        // hidden section disappears as a whole.
        if (!col.section) return field
        return (
          <React.Fragment key={col.column_name}>
            <SectionHeader text={col.section} major={/^#{1,2}\s/.test(col.section)} />
            {field}
          </React.Fragment>
        )
      })}
    </div>
  )
}
