import React from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

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

export function FormRenderer({ columns, readOnlyFields = [] }: FormRendererProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext()

  return (
    <div className="flex flex-col gap-6 w-full">
      {columns.map(col => {
        const isReadOnly = readOnlyFields.includes(col.column_name)
        const error = errors[col.column_name]

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
