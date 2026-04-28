import React, { useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import Page from 'components/common/layouts/page'
import { FormRenderer, type FormColumn } from './FormRenderer'
import { OtpGate } from './OtpGate'
import { CriteriaEligibilityButton } from './CriteriaEligibilityButton'
import { renderInlineMarkdown } from './inline-markdown'
import { supabase } from 'services/supabase-browser'
import Link from 'next/link'
import Image from 'next/image'
import dc8Logo from 'assets/images/dc-8/dc8-logo.png'

interface SchemaResponse {
  title: string
  subheading?: string
  successMsg?: string
  columns: FormColumn[]
}

const ADMIN_EMAILS = new Set(['lasse.jacobsen@ethereum.org'])

interface ClassificationResult {
  email: string
  isPersonal: boolean
  isUniversity: boolean
  isGovernment: boolean
  isDisposable: boolean
  organizationType: string
  rootDomain: string | null
  signals: string[]
}

function EmailClassifierDebug({ callerEmail }: { callerEmail: string }) {
  const [testEmail, setTestEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ heuristic: ClassificationResult; ai: ClassificationResult | null } | null>(null)
  const [open, setOpen] = useState(false)

  if (!ADMIN_EMAILS.has(callerEmail)) return null

  const handleClassify = async () => {
    if (!testEmail) return
    setLoading(true)
    setResult(null)
    try {
      if (!supabase) {
        setLoading(false)
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setLoading(false)
        return
      }
      const res = await fetch('/api/nocodb/classify-email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: testEmail }),
      })
      const data = await res.json()
      if (data.success) setResult({ heuristic: data.heuristic, ai: data.ai })
    } catch {}
    setLoading(false)
  }

  const renderClassification = (label: string, c: ClassificationResult) => (
    <div className="text-xs space-y-1">
      <p className="font-bold text-[#160b2b]">{label}</p>
      <div className="flex flex-wrap gap-1">
        <span className={`px-1.5 py-0.5 rounded ${c.isUniversity ? 'bg-green-100 text-green-800' : c.isPersonal ? 'bg-yellow-100 text-yellow-800' : c.isDisposable ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
          {c.organizationType}
        </span>
        {c.isUniversity && <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800">university</span>}
        {c.isPersonal && <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">personal</span>}
        {c.isDisposable && <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800">disposable</span>}
        {c.isGovernment && <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">government</span>}
      </div>
      <p className="text-[#594d73]">domain: {c.rootDomain || '—'}</p>
      <p className="text-[#594d73]">signals: {c.signals.length ? c.signals.join(', ') : 'none'}</p>
    </div>
  )

  return (
    <div className="w-full mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs text-[#594d73] hover:text-[#7235ed] font-mono"
      >
        {open ? '▼' : '▶'} Email Classifier Debug
      </button>

      {open && (
        <div className="mt-2 p-3 bg-[#f9f8fa] rounded-lg border border-[#dddae2] space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleClassify()}
              placeholder="test@example.edu"
              className="flex-1 px-3 py-1.5 text-sm border border-[#dddae2] rounded-md"
            />
            <button
              type="button"
              onClick={handleClassify}
              disabled={loading || !testEmail}
              className="px-3 py-1.5 text-xs font-bold bg-[#7235ed] text-white rounded-md disabled:opacity-50"
            >
              {loading ? '...' : 'Classify'}
            </button>
          </div>

          {result && (
            <div className="space-y-3">
              {renderClassification('Heuristic', result.heuristic)}
              {result.ai && renderClassification('AI-enriched', result.ai)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type EligibilityBucket = 'top-indian-university' | 'other-indian-university' | 'ai-university' | 'blocked'

function EligibilityGate({
  email,
  viewId,
  onSignOut,
  children,
}: {
  email: string
  viewId: string
  onSignOut: () => void
  children: React.ReactNode
}) {
  const [bucket, setBucket] = useState<EligibilityBucket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!email || !supabase) return

    const cacheKey = `eligibility:${email}`
    const cached = typeof window !== 'undefined' ? window.sessionStorage.getItem(cacheKey) : null

    if (cached) {
      setBucket(cached as EligibilityBucket)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) {
        setError('Session expired')
        setLoading(false)
        return
      }

      fetch(`/api/nocodb/${viewId}/check-eligibility/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(async res => {
          const text = await res.text()
          let result: any
          try {
            result = JSON.parse(text)
          } catch {
            throw new Error(`Server returned non-JSON (${res.status}): ${text.slice(0, 120)}`)
          }
          if (!result.success) throw new Error(result.error || `Eligibility check failed (${res.status})`)
          window.sessionStorage.setItem(cacheKey, result.bucket)
          setBucket(result.bucket)
        })
        .catch(err => {
          console.error('[EligibilityGate]', err)
          setError(err.message)
        })
        .finally(() => setLoading(false))
    })
  }, [email, viewId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Image src={dc8Logo} alt="Checking eligibility" width={64} height={28} className="animate-pulse opacity-60" />
        <p className="text-sm text-[#594d73]">Checking eligibility...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h3 className="text-xl font-extrabold text-[#160b2b] tracking-[-0.5px]">
          Something went wrong
        </h3>
        <p className="text-sm text-[#1a0d33] leading-5">
          We couldn&apos;t verify your eligibility. Please try again, or contact{' '}
          <a href="mailto:support@devcon.org" className="font-bold text-[#7235ed] hover:underline">
            support@devcon.org
          </a>{' '}
          if the problem persists.
        </p>
        <p className="text-xs text-[#594d73] font-mono">{error}</p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-2 px-8 py-4 bg-[#7235ed] text-white text-base font-bold rounded-full hover:bg-[#6029d1] transition-colors"
        >
          Start over
        </button>
      </div>
    )
  }

  if (bucket === 'blocked') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h3 className="text-xl font-extrabold text-[#160b2b] tracking-[-0.5px]">
          This email isn&apos;t eligible
        </h3>
        <p className="text-sm text-[#1a0d33] leading-5">
          The student application is intended for currently enrolled students. Please sign in
          with your university email address to continue.
        </p>
        <p className="text-sm text-[#1a0d33] leading-5">
          If your university email isn&apos;t working, or you believe this is a mistake, reach out
          to{' '}
          <a href="mailto:support@devcon.org" className="font-bold text-[#7235ed] hover:underline">
            support@devcon.org
          </a>
          .
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-2 px-8 py-4 bg-[#7235ed] text-white text-base font-bold rounded-full hover:bg-[#6029d1] transition-colors"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return <>{children}</>
}

interface FormPageProps {
  viewId: string
  requireOtp: boolean
  closed?: boolean
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

  // When user is verified via OTP, hide email fields entirely (shown in "Signed in as" banner)
  const hiddenFields = verifiedEmail
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
        <FormRenderer columns={schema.columns} hiddenFields={hiddenFields} />

        {requireOtp && (
          <div className="mx-auto">
            <CriteriaEligibilityButton />
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div className={`flex items-center w-full ${onSignOut ? 'justify-between' : 'justify-center'}`}>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="text-base font-bold text-[#b42124] hover:underline"
            >
              Cancel &amp; Sign Out
            </button>
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

        <p className="text-xs text-[#594d73] text-center leading-[18px] pt-2 border-t border-[rgba(34,17,68,0.08)]">
          By submitting this form, you acknowledge the Ethereum Foundation&apos;s{' '}
          <a
            href="https://ethereum.org/en/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#7235ed] hover:underline"
          >
            Privacy Policy
          </a>
          . We&apos;ll only use your information for Devcon-related communications and won&apos;t share it with third parties.
        </p>
      </form>
    </FormProvider>
  )
}

export default function FormPage({ viewId, requireOtp, closed }: FormPageProps) {
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

  if (closed) {
    return (
      <Page darkHeader darkFooter>
        <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-t from-[#e5ebff] from-[20%] to-[#fbfafc] py-16">
          <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-8 max-w-[640px] w-full mx-4">
            <div className="flex flex-col items-center gap-4">
              <Image src={dc8Logo} alt="Devcon 8 India" width={127} height={56} />
              <h2 className="text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] text-center leading-[28.8px]">
                {schema?.title || 'Form'}
              </h2>
              <p className="text-sm text-[#1a0d33] leading-5 text-center whitespace-pre-line">
                This form is closed, please check back later.
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

              {schema?.successMsg ? (
                <p className="text-sm text-[#1a0d33] leading-5 text-center whitespace-pre-line">{schema.successMsg}</p>
              ) : (
                <p className="text-sm text-[#1a0d33] leading-5 text-center">Your submission has been received.</p>
              )}

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
        const {
          data: { session },
        } = await supabase.auth.getSession()
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
                <EligibilityGate email={verifiedEmail} viewId={viewId} onSignOut={onSignOut}>
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
                  <EmailClassifierDebug callerEmail={verifiedEmail} />
                </EligibilityGate>
              )}
            </OtpGate>
          ) : (
            <>
              <Image src={dc8Logo} alt="Devcon 8 India" width={127} height={56} />
              <h2 className="text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] text-center leading-[28.8px]">
                {schema.title}
              </h2>
              {schema.subheading && (
                <p className="text-sm text-[#1a0d33] leading-5 text-center whitespace-pre-line">{renderInlineMarkdown(schema.subheading)}</p>
              )}
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
