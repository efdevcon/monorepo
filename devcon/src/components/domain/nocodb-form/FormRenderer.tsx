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
          return (
            <div key={col.column_name} className="space-y-1.5">
              <Label htmlFor={col.column_name}>
                {col.title}
                {col.required && <span className="text-red-500 ml-0.5">*</span>}
              </Label>
              {col.description && <p className="text-sm text-neutral-500">{col.description}</p>}
              <Input
                id={col.column_name}
                disabled={isReadOnly}
                {...register(col.column_name, {
                  required: col.required ? `${col.title} is required` : false,
                })}
              />
              {error && <p className="text-sm text-red-500">{error.message as string}</p>}
            </div>
          )
        }

        if (col.uidt === 'Email') {
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
                disabled={isReadOnly}
                {...register(col.column_name, {
                  required: col.required ? `${col.title} is required` : false,
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                })}
              />
              {error && <p className="text-sm text-red-500">{error.message as string}</p>}
            </div>
          )
        }

        if (col.uidt === 'LongText') {
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
                disabled={isReadOnly}
                {...register(col.column_name, {
                  required: col.required ? `${col.title} is required` : false,
                })}
              />
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
