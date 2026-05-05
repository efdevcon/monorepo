import React, { useEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { supabase } from 'services/supabase-browser'

interface EnrollmentProofUploadProps {
  viewId: string
}

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = '.pdf,image/png,image/jpeg,image/webp'

interface NocoAttachment {
  url?: string
  path?: string
  signedPath?: string
  title: string
  mimetype: string
  size: number
}

export function EnrollmentProofUpload({ viewId }: EnrollmentProofUploadProps) {
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
    register('enrollment_proof', {
      validate: v =>
        (Array.isArray(v) && v.length > 0) || 'Please upload proof of enrollment',
    })
  }, [register])

  const attachments = watch('enrollment_proof') as NocoAttachment[] | undefined
  const hasFile = Array.isArray(attachments) && attachments.length > 0
  const fieldError = errors.enrollment_proof
  const errorMessage = uploadError || (fieldError?.message as string | undefined)

  const handlePick = () => inputRef.current?.click()

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadError('')

    if (file.size > MAX_BYTES) {
      setUploadError('File is too large (max 5MB)')
      return
    }

    setUploading(true)
    try {
      if (!supabase) throw new Error('Auth not available')
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Session expired — please sign in again')

      const formData = new FormData()
      formData.append('files', file)

      const res = await fetch(`/api/nocodb/${viewId}/upload-proof/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || 'Upload failed')

      setValue('enrollment_proof', result.attachments, { shouldValidate: true })
    } catch (err) {
      setUploadError((err as Error).message)
      setValue('enrollment_proof', [], { shouldValidate: true })
    } finally {
      setUploading(false)
    }
  }

  const status = uploading
    ? 'Uploading...'
    : hasFile
    ? attachments![0].title
    : 'No file chosen'

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#f2f1f4] rounded-lg w-full">
      <div className="flex flex-col gap-2">
        <p className="text-base font-bold text-[#160b2b] leading-6">
          We couldn&apos;t verify your student status
          <span className="text-[#b42124] ml-0.5">*</span>
        </p>
        <p className="text-sm text-[#160b2b] leading-5">
          The email address you provided doesn&apos;t appear to be institution-issued. Please upload a
          transcript or student ID that clearly shows your name and the institution you attend.
        </p>
      </div>

      <button
        type="button"
        onClick={handlePick}
        disabled={uploading}
        className="flex items-center gap-3 w-full px-4 py-2.5 bg-white border border-[rgba(34,17,68,0.1)] rounded-lg shadow-[0_1px_2px_0_rgba(22,11,43,0.04)] text-sm text-left disabled:opacity-50 hover:border-[rgba(34,17,68,0.2)] transition-colors min-w-0"
      >
        <span className="font-medium text-[#7235ed] shrink-0">Upload document</span>
        <span
          className={`min-w-0 truncate ${hasFile ? 'text-[#160b2b]' : 'text-[#594d73]'}`}
        >
          {status}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleChange}
        className="hidden"
      />

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
    </div>
  )
}
