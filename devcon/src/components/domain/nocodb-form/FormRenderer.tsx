import React from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

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

interface FormRendererProps {
  columns: FormColumn[]
  readOnlyFields?: string[]
}

export function FormRenderer({ columns, readOnlyFields = [] }: FormRendererProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext()

  return (
    <div className="space-y-5">
      {columns.map(col => {
        const isReadOnly = readOnlyFields.includes(col.column_name)
        const error = errors[col.column_name]

        if (col.uidt === 'SingleLineText') {
          const max = CHAR_LIMITS.SingleLineText
          const val = watch(col.column_name) || ''
          return (
            <div key={col.column_name} className="space-y-1.5">
              <Label htmlFor={col.column_name}>
                {col.title}
                {col.required && <span className="text-red-500 ml-0.5">*</span>}
              </Label>
              {col.description && <p className="text-sm text-neutral-500">{col.description}</p>}
              <Input
                id={col.column_name}
                maxLength={max}
                disabled={isReadOnly}
                {...register(col.column_name, {
                  required: col.required ? `${col.title} is required` : false,
                  maxLength: { value: max, message: `Maximum ${max} characters` },
                })}
              />
              {error && <p className="text-sm text-red-500">{error.message as string}</p>}
            </div>
          )
        }

        if (col.uidt === 'Email') {
          const max = CHAR_LIMITS.Email
          return (
            <div key={col.column_name} className="space-y-1.5">
              <Label htmlFor={col.column_name}>
                {col.title}
                {col.required && <span className="text-red-500 ml-0.5">*</span>}
              </Label>
              {col.description && <p className="text-sm text-neutral-500">{col.description}</p>}
              <Input
                id={col.column_name}
                type="email"
                maxLength={max}
                disabled={isReadOnly}
                {...register(col.column_name, {
                  required: col.required ? `${col.title} is required` : false,
                  maxLength: { value: max, message: `Maximum ${max} characters` },
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                })}
              />
              {error && <p className="text-sm text-red-500">{error.message as string}</p>}
            </div>
          )
        }

        if (col.uidt === 'LongText') {
          const max = CHAR_LIMITS.LongText
          const val: string = watch(col.column_name) || ''
          return (
            <div key={col.column_name} className="space-y-1.5">
              <Label htmlFor={col.column_name}>
                {col.title}
                {col.required && <span className="text-red-500 ml-0.5">*</span>}
              </Label>
              {col.description && <p className="text-sm text-neutral-500">{col.description}</p>}
              <Textarea
                id={col.column_name}
                rows={4}
                maxLength={max}
                disabled={isReadOnly}
                {...register(col.column_name, {
                  required: col.required ? `${col.title} is required` : false,
                  maxLength: { value: max, message: `Maximum ${max} characters` },
                })}
              />
              <p className={`text-xs text-right ${val.length >= max ? 'text-red-500' : 'text-neutral-400'}`}>
                {val.length}/{max}
              </p>
              {error && <p className="text-sm text-red-500">{error.message as string}</p>}
            </div>
          )
        }

        if (col.uidt === 'SingleSelect' && col.options) {
          const currentValue = watch(col.column_name)
          return (
            <div key={col.column_name} className="space-y-1.5">
              <Label htmlFor={col.column_name}>
                {col.title}
                {col.required && <span className="text-red-500 ml-0.5">*</span>}
              </Label>
              {col.description && <p className="text-sm text-neutral-500">{col.description}</p>}
              <Select
                value={currentValue || ''}
                onValueChange={val => setValue(col.column_name, val, { shouldValidate: true })}
                disabled={isReadOnly}
              >
                <SelectTrigger id={col.column_name}>
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
              {error && <p className="text-sm text-red-500">{error.message as string}</p>}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
