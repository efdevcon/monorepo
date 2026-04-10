import React, { useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import Page from 'components/common/layouts/page'
import { FormRenderer, type FormColumn } from './FormRenderer'
import { OtpGate } from './OtpGate'
import { supabase } from 'services/supabase-browser'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import dc8Logo from 'assets/images/dc-8/dc8-logo.png'

interface SchemaResponse {
  title: string
  columns: FormColumn[]
}

interface FormPageProps {
  viewId: string
  requireOtp: boolean
}

function FormInner({
  schema,
  methods,
  onSubmit,
  submitting,
  error,
  verifiedEmail,
  viewId,
  requireOtp,
  onSignOut,
}: {
  schema: SchemaResponse
  methods: ReturnType<typeof useForm<Record<string, any>>>
  onSubmit: (data: Record<string, any>) => Promise<void>
  submitting: boolean
  error: string
  verifiedEmail?: string
  viewId: string
  requireOtp?: boolean
  onSignOut?: () => void
}) {
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [isUpdate, setIsUpdate] = useState(false)

  const readOnlyFields = verifiedEmail
    ? schema.columns.filter(c => c.uidt === 'Email').map(c => c.column_name)
    : []

  useEffect(() => {
    if (!verifiedEmail || !supabase) return

    const emailCol = schema.columns.find(c => c.uidt === 'Email')
    if (emailCol) {
      methods.setValue(emailCol.column_name, verifiedEmail)
    }

    setLoadingExisting(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) {
        setLoadingExisting(false)
        return
      }

      fetch(`/api/nocodb/${viewId}/submission/`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data) {
            setIsUpdate(true)
            for (const [key, value] of Object.entries(result.data)) {
              if (value !== null && value !== undefined) {
                methods.setValue(key, value)
              }
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingExisting(false))
    })
  }, [verifiedEmail, schema.columns, methods, viewId])

  if (loadingExisting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Image src={dc8Logo} alt="Loading" width={64} height={28} className="animate-pulse opacity-60" />
        <p className="text-sm text-[#594d73]">Loading your submission...</p>
      </div>
    )
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-6 w-full">
        <FormRenderer columns={schema.columns} readOnlyFields={readOnlyFields} />

        {requireOtp && (
          <Link
            href="/tickets"
            className="flex items-center gap-1.5 mx-auto px-4 py-1.5 text-sm font-bold text-[#7235ed] hover:underline"
          >
            Learn more about eligibility
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div className="flex items-center justify-between w-full">
          {onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="text-base font-bold text-[#b42124] hover:underline"
            >
              Cancel &amp; Sign Out
            </button>
          ) : (
            <div />
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-4 bg-[#7235ed] text-white text-base font-bold rounded-full hover:bg-[#6029d1] disabled:opacity-50 transition-colors"
          >
            {submitting
              ? (isUpdate ? 'Updating...' : 'Submitting...')
              : (isUpdate ? 'Update' : 'Submit')}
          </button>
        </div>
      </form>
    </FormProvider>
  )
}

export default function FormPage({ viewId, requireOtp }: FormPageProps) {
  const [schema, setSchema] = useState<SchemaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const methods = useForm<Record<string, any>>()

  useEffect(() => {
    if (!viewId) return

    setLoading(true)
    setError('')

    fetch(`/api/nocodb/${viewId}/schema/`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load form')
        setSchema(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [viewId])

  if (loading || !viewId) {
    return (
      <Page darkHeader darkFooter>
        <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gradient-to-t from-[#e5ebff] from-[20%] to-[#fbfafc] gap-4">
          <Image src={dc8Logo} alt="Loading" width={64} height={28} className="animate-pulse opacity-60" />
          <p className="text-sm text-[#594d73]">Loading...</p>
        </div>
      </Page>
    )
  }

  if (error && !schema) {
    return (
      <Page darkHeader darkFooter>
        <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-t from-[#e5ebff] from-[20%] to-[#fbfafc]">
          <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-8 max-w-[640px] w-full mx-4 text-center">
            <h2 className="text-2xl font-extrabold text-[#160b2b] mb-4">Error</h2>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </div>
      </Page>
    )
  }

  if (submitted) {
    return (
      <Page darkHeader darkFooter>
        <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-t from-[#e5ebff] from-[20%] to-[#fbfafc] py-16">
          <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-8 max-w-[640px] w-full mx-4">
            <div className="flex flex-col items-center gap-4">
              <Image src={dc8Logo} alt="Devcon 8 India" width={127} height={56} />

              <h2 className="text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] text-center leading-[28.8px]">
                Thank you!
              </h2>

              <p className="text-sm text-[#1a0d33] leading-5 text-center">
                Your application has been submitted.
              </p>

              <p className="text-sm text-[#1a0d33] leading-5 text-center">
                Applications will be reviewed on a rolling basis. Keep an eye on your email for a decision from our approval team.
              </p>

              <Link
                href="/"
                className="px-8 py-4 bg-[#7235ed] text-white text-base font-bold rounded-full hover:bg-[#6029d1] transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </Page>
    )
  }

  if (!schema) return null

  const onSubmit = async (formData: Record<string, any>) => {
    setSubmitting(true)
    setError('')
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }

      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }

      const res = await fetch(`/api/nocodb/${viewId}/submit/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data: formData }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Submission failed')
      setSubmitted(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page darkHeader darkFooter>
      <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-t from-[#e5ebff] from-[20%] to-[#fbfafc] py-16">
        <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-8 max-w-[640px] w-full mx-4 flex flex-col items-center gap-6">
          {requireOtp ? (
            <OtpGate title={schema.title}>
              {(verifiedEmail, onSignOut) => (
                <FormInner
                  schema={schema}
                  methods={methods}
                  onSubmit={onSubmit}
                  submitting={submitting}
                  error={error}
                  verifiedEmail={verifiedEmail}
                  viewId={viewId}
                  requireOtp={requireOtp}
                  onSignOut={onSignOut}
                />
              )}
            </OtpGate>
          ) : (
            <>
              <Image src={dc8Logo} alt="Devcon 8 India" width={127} height={56} />
              <h2 className="text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] text-center leading-[28.8px]">
                {schema.title}
              </h2>
              <FormInner
                schema={schema}
                methods={methods}
                onSubmit={onSubmit}
                submitting={submitting}
                error={error}
                viewId={viewId}
              />
            </>
          )}
        </div>
      </div>
    </Page>
  )
}
