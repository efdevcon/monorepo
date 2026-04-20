import React, { useState, useRef, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ChevronDown } from 'lucide-react'
import { COUNTRIES } from './countries'

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
  return <p className="text-sm text-[#594d73] leading-5">{text}</p>
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

export function FormRenderer({ columns, readOnlyFields = [], hiddenFields = [] }: FormRendererProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext()

  return (
    <div className="flex flex-col gap-6 w-full">
      {columns.map(col => {
        if (hiddenFields.includes(col.column_name)) return null
        const isReadOnly = readOnlyFields.includes(col.column_name)
        const error = errors[col.column_name]

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
