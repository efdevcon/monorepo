import React, { useState, useRef, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ChevronDown, X, FileText, Download, ExternalLink } from 'lucide-react'
import { COUNTRIES } from './countries'
import { renderInlineMarkdown } from './inline-markdown'
import { supabase } from 'services/supabase-browser'

export interface FormColumn {
  title: string
  column_name: string
  uidt: string
  required: boolean
  description?: string
  options?: string[]
}

const CHAR_LIMITS: Record<string, number> = {
  SingleLineText: 255,
  Email: 255,
  LongText: 1000,
}

const COUNTRY_FIELD_NAMES = new Set(['country', 'country of residence', 'nationality'])

function isCountryField(col: FormColumn): boolean {
  return COUNTRY_FIELD_NAMES.has(col.title.toLowerCase())
}

interface FormRendererProps {
  columns: FormColumn[]
  readOnlyFields?: string[]
  hiddenFields?: string[]
  viewId: string
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

function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: NocoAttachment
  onRemove?: () => void
}) {
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

function AttachmentField({
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

  useEffect(() => {
    register(col.column_name, {
      validate: v => {
        if (!col.required) return true
        return (Array.isArray(v) && v.length > 0) || `${col.title} is required`
      },
    })
  }, [register, col.column_name, col.required, col.title])

  // NocoDB sometimes returns attachments as a JSON-encoded string on read; normalize.
  const rawAttachments = watch(col.column_name)
  const attachments: NocoAttachment[] = Array.isArray(rawAttachments)
    ? rawAttachments
    : typeof rawAttachments === 'string'
    ? (() => {
        try { return JSON.parse(rawAttachments) } catch { return [] }
      })()
    : []
  const hasFiles = attachments.length > 0
  const fieldError = errors[col.column_name]
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

      setValue(col.column_name, [...attachments, ...uploaded], { shouldValidate: true })
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = (idx: number) => {
    const next = attachments.filter((_, i) => i !== idx)
    setValue(col.column_name, next, { shouldValidate: true })
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
        <span className="font-medium text-[#7235ed] shrink-0">
          {hasFiles ? 'Add more' : 'Choose file(s)'}
        </span>
        <span className="text-[#594d73] truncate">
          {uploading ? 'Uploading…' : 'PDF, DOC, PNG, JPG up to 10MB'}
        </span>
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

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options

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
        <span className={value ? 'text-[#160b2b]' : 'text-[#594d73]'}>
          {value || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-[#594d73] shrink-0" />
      </button>

      {open && (
        <div style={{ border: '1px solid #dddae2', maxHeight: 280, display: 'flex', flexDirection: 'column', position: 'absolute', zIndex: 50, marginTop: 4, width: '100%', background: 'white', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: 8, borderBottom: '1px solid #dddae2', flexShrink: 0 }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{ border: '1px solid #dddae2', width: '100%', padding: '6px 12px', fontSize: 14, borderRadius: 6, outline: 'none', display: 'block', boxSizing: 'border-box' }}
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

export function FormRenderer({ columns, readOnlyFields = [], hiddenFields = [], viewId }: FormRendererProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext()

  return (
    <div className="flex flex-col gap-6 w-full">
      {columns.map(col => {
        if (hiddenFields.includes(col.column_name)) return null
        const isReadOnly = readOnlyFields.includes(col.column_name)
        const error = errors[col.column_name]

        if (col.uidt === 'Attachment') {
          return <AttachmentField key={col.column_name} col={col} viewId={viewId} isReadOnly={isReadOnly} />
        }

        // Country fields → searchable dropdown
        if (isCountryField(col)) {
          const currentValue = watch(col.column_name) || ''
          return (
            <div key={col.column_name} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <FieldLabel title={col.title} required={col.required} />
                {col.description && <FieldDescription text={col.description} />}
              </div>
              <SearchableSelect
                value={currentValue}
                onChange={val => setValue(col.column_name, val, { shouldValidate: true })}
                options={COUNTRIES}
                placeholder="Select a country"
                disabled={isReadOnly}
              />
              {col.required && (
                <input
                  type="hidden"
                  {...register(col.column_name, { required: `${col.title} is required` })}
                />
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
                {...register(col.column_name, {
                  required: col.required ? `${col.title} is required` : false,
                  maxLength: { value: max, message: `Maximum ${max} characters` },
                })}
              />
              {error && <FieldError message={error.message as string} />}
            </div>
          )
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
                {...register(col.column_name, {
                  required: col.required ? `${col.title} is required` : false,
                  maxLength: { value: max, message: `Maximum ${max} characters` },
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                })}
              />
              {error && <FieldError message={error.message as string} />}
            </div>
          )
        }

        if (col.uidt === 'LongText') {
          const max = CHAR_LIMITS.LongText
          const val: string = watch(col.column_name) || ''
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
                {...register(col.column_name, {
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
                {...register(col.column_name, {
                  required: col.required ? `${col.title} is required` : false,
                })}
              />
              {error && <FieldError message={error.message as string} />}
            </div>
          )
        }

        if (col.uidt === 'SingleSelect' && col.options) {
          const currentValue = watch(col.column_name)
          return (
            <div key={col.column_name} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <FieldLabel title={col.title} required={col.required} />
                {col.description && <FieldDescription text={col.description} />}
              </div>
              <Select
                value={currentValue || ''}
                onValueChange={val => setValue(col.column_name, val, { shouldValidate: true })}
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
                  {...register(col.column_name, {
                    required: `${col.title} is required`,
                  })}
                />
              )}
              {error && <FieldError message={error.message as string} />}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
