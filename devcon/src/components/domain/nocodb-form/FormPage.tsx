import React, { useEffect, useRef, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import Page from 'components/common/layouts/page'
import { FormRenderer, type FormColumn } from './FormRenderer'
import { rhfFieldName, remapToOriginalNames } from './rhf-key'
import { FormSubheading } from './FormSubheading'
import { OtpGate } from './OtpGate'
import { CriteriaEligibilityButton } from './CriteriaEligibilityButton'
import { EnrollmentProofUpload } from './EnrollmentProofUpload'
import { supabase } from 'services/supabase-browser'
import { useBuilderConnect } from 'context/BuilderConnectContext'
import { isGithubTitle, isWalletTitle } from 'config/form-field-markers'
import Link from 'next/link'
import Image from 'next/image'
import { FileText } from 'lucide-react'
import dc8Logo from 'assets/images/dc-8/dc8-logo.png'
import { FormHeaderImage } from './FormHeaderImage'

interface ConditionalRule {
  targetColumnId: string
  sourceColumnId: string
  op: string
  value: string | null
  logicalOp: 'and' | 'or'
  enabled: boolean
}

interface SchemaResponse {
  title: string
  subheading?: string
  successMsg?: string
  columns: FormColumn[]
  conditionalRules?: ConditionalRule[]
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
  const [result, setResult] = useState<{
    heuristic: ClassificationResult
    ai: ClassificationResult | null
    eligibility: { bucket: EligibilityBucket; email: string; domain: string | null } | null
  } | null>(null)
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
      const {
        data: { session },
      } = await supabase.auth.getSession()
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
      if (data.success) setResult({ heuristic: data.heuristic, ai: data.ai, eligibility: data.eligibility ?? null })
    } catch {}
    setLoading(false)
  }

  const renderClassification = (label: string, c: ClassificationResult) => (
    <div className="text-xs space-y-1">
      <p className="font-bold text-[#160b2b]">{label}</p>
      <div className="flex flex-wrap gap-1">
        <span
          className={`px-1.5 py-0.5 rounded ${
            c.isUniversity
              ? 'bg-green-100 text-green-800'
              : c.isPersonal
              ? 'bg-yellow-100 text-yellow-800'
              : c.isDisposable
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
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
              {result.eligibility && (
                <div className="text-xs space-y-1 pt-2 border-t border-[#dddae2]">
                  <p className="font-bold text-[#160b2b]">Eligibility (cached in Supabase)</p>
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded ${
                      result.eligibility.bucket === 'blocked'
                        ? 'bg-red-100 text-red-800'
                        : result.eligibility.bucket === 'top-indian-university'
                        ? 'bg-green-100 text-green-800'
                        : result.eligibility.bucket === 'other-indian-university'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {result.eligibility.bucket}
                  </span>
                </div>
              )}
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
  children: (bucket: EligibilityBucket) => React.ReactNode
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
        <h3 className="text-xl font-extrabold text-[#160b2b] tracking-[-0.5px]">Something went wrong</h3>
        <p className="text-sm text-[#1a0d33] leading-5">
          Please try again, or contact{' '}
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

  if (!bucket) return null

  return <>{children(bucket)}</>
}

interface FormPageProps {
  viewId: string
  requireOtp: boolean
  closed?: boolean
  // Form slug from the NocoDB form config. Used to scope behavior that's only
  // relevant to a specific form (e.g. the student-application eligibility CTA).
  formSlug?: string
}

// Slug of the student application form in NocoDB. Only this form should render
// the "View criteria and eligibility" CTA below the submit button.
const STUDENT_APPLICATION_SLUG = 'student-application'

// Slug of the visa-collection form. Submissions are gated on the signed-in
// email having a paid Pretix order (purchaser or assigned attendee).
const VISA_FORM_SLUG = 'visa-collection-attendees'

// Slug of the youth-ticket request form. The two consent checkboxes on this
// form reference the Parental Consent Form — surface a link to the full
// document so the parent/guardian can review before agreeing.
const YOUTH_TICKET_SLUG = 'youth-ticket'

function VisaTicketGate({
  email,
  onSignOut,
  children,
}: {
  email: string
  onSignOut: () => void
  children: () => React.ReactNode
}) {
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading')

  useEffect(() => {
    if (!email || !supabase) return

    const cacheKey = `visa-ticket:${email}`
    const cached = typeof window !== 'undefined' ? window.sessionStorage.getItem(cacheKey) : null
    if (cached === 'ok' || cached === 'denied') {
      setState(cached)
      return
    }

    setState('loading')

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) {
        setState('denied')
        return
      }

      // Lookup failures and "no ticket found" both deny access — the user can't
      // distinguish them and the recovery is the same (try a different email or
      // contact support). We log the underlying error to the console for ops.
      fetch('/api/pretix/has-ticket/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(async res => {
          const text = await res.text()
          let result: any
          try {
            result = JSON.parse(text)
          } catch {
            console.warn('[VisaTicketGate] non-JSON response', res.status, text.slice(0, 200))
            setState('denied')
            return
          }
          if (!result.success) {
            console.warn('[VisaTicketGate] lookup failed', result.error, result.details)
            setState('denied')
            return
          }
          const next = result.hasTicket ? 'ok' : 'denied'
          window.sessionStorage.setItem(cacheKey, next)
          setState(next)
        })
        .catch(err => {
          console.warn('[VisaTicketGate] network error', err?.message)
          setState('denied')
        })
    })
  }, [email])

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Image src={dc8Logo} alt="Checking ticket" width={64} height={28} className="animate-pulse opacity-60" />
        <p className="text-sm text-[#594d73]">Checking your ticket...</p>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h3 className="text-xl font-extrabold text-[#160b2b] tracking-[-0.5px]">Devcon ticket required</h3>
        <p className="text-sm text-[#1a0d33] leading-5">
          A Devcon ticket is required to fill in this form. Make sure you have a ticket assigned to the email you used
          to sign into this form.
        </p>
        <p className="text-sm text-[#1a0d33] leading-5">
          You signed in as <span className="font-bold break-all">{email}</span>. Need help? Contact{' '}
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

  return <>{children()}</>
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
  bucket,
  formSlug,
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
  bucket?: EligibilityBucket
  formSlug?: string
}) {
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [isUpdate, setIsUpdate] = useState(false)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const { qualifyingDiscount } = useBuilderConnect()

  // When a submission error appears, scroll it into view — on a long form the
  // error sits near the submit button and is easy to miss otherwise.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  // On validation failure, scroll to the first invalid field so the applicant
  // sees what's blocking the submit instead of a button that "did nothing".
  // We scroll to the first rendered error message (DOM order = field order),
  // which works for every field type — including ones registered without a DOM
  // <input name> (e.g. the Role multi-select). Deferred so the error elements
  // have rendered after react-hook-form sets validation state.
  const scrollToFirstError = () => {
    if (typeof document === 'undefined') return
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>('[data-field-error]')
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 0)
  }

  // When user is verified via OTP, hide email fields entirely (shown in "Signed in as" banner).
  // For the student-application form, also hide the enrollment_proof attachment from the
  // generic renderer — the bespoke EnrollmentProofUpload below handles it conditionally
  // (only shown for the "blocked" eligibility bucket).
  const hiddenFields = [
    ...(verifiedEmail ? schema.columns.filter(c => c.uidt === 'Email').map(c => c.column_name) : []),
    ...(formSlug === STUDENT_APPLICATION_SLUG ? ['enrollment_proof'] : []),
  ]

  useEffect(() => {
    if (!verifiedEmail || !supabase) return

    const emailCol = schema.columns.find(c => c.uidt === 'Email')
    if (emailCol) {
      methods.setValue(rhfFieldName(emailCol.column_name), verifiedEmail)
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
            // NocoDB stores MultiSelect as a comma-separated string; the UI
            // expects an array. Look up the column type by name to decide
            // whether to split.
            const multiSelectCols = new Set(
              schema.columns.filter(c => c.uidt === 'MultiSelect').map(c => c.column_name)
            )
            // Connector fields (GitHub / wallet) must reflect the LIVE connection
            // (NextAuth session / signed proof), not the stored value — otherwise
            // a disconnected user gets silently "reconnected" from their saved row
            // on refresh. They re-populate via their own restore logic instead.
            const connectorCols = new Set(
              schema.columns.filter(c => isGithubTitle(c.title) || isWalletTitle(c.title)).map(c => c.column_name)
            )
            for (const [key, value] of Object.entries(result.data)) {
              if (value === null || value === undefined) continue
              if (connectorCols.has(key)) continue
              // Server returns the original NocoDB column names; the form
              // is registered under sanitized aliases (see rhfFieldName).
              if (multiSelectCols.has(key) && typeof value === 'string') {
                const parts = value
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean)
                methods.setValue(rhfFieldName(key), parts)
              } else {
                methods.setValue(rhfFieldName(key), value)
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
      <form onSubmit={methods.handleSubmit(onSubmit, scrollToFirstError)} className="flex flex-col gap-6 w-full">
        {schema.subheading && <FormSubheading text={schema.subheading} />}

        {qualifyingDiscount && (
          <div className="flex flex-col gap-2 rounded-xl border border-[#b7e6c9] bg-[#e6f7ed] p-4">
            <p className="text-base font-bold text-[#137a3e]">
              🎉 You already qualify for{' '}
              {qualifyingDiscount.discount >= 100 ? 'a FREE ticket' : `${qualifyingDiscount.discount}% off`} via{' '}
              {qualifyingDiscount.name}!
            </p>
            <p className="text-sm text-[#3b3450] leading-5">
              You don&apos;t need to apply here — claim it instantly at the{' '}
              <a href="/en/tickets/store/" className="font-bold text-[#137a3e] underline">
                ticket store
              </a>
              . Connect the same GitHub / wallet there and the discount is applied automatically.
            </p>
          </div>
        )}

        <FormRenderer
          columns={schema.columns}
          hiddenFields={hiddenFields}
          viewId={viewId}
          conditionalRules={schema.conditionalRules}
        />

        {bucket === 'blocked' && <EnrollmentProofUpload viewId={viewId} />}

        {requireOtp && formSlug === STUDENT_APPLICATION_SLUG && (
          <div className="mx-auto">
            <CriteriaEligibilityButton />
          </div>
        )}

        {formSlug === YOUTH_TICKET_SLUG && (
          <div className="flex items-start gap-3 px-4 py-3 bg-[#f3f0ff] border border-[#decffb] rounded-lg text-sm leading-5 text-[#1a0d33]">
            <FileText className="w-4 h-4 mt-0.5 shrink-0 text-[#7235ed]" aria-hidden="true" />
            <p>
              Before you submit, please review the{' '}
              <Link
                href="/parental-consent-form"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#7235ed] hover:underline"
              >
                Devcon 8 Parental Consent and Release Terms
              </Link>
              .
            </p>
          </div>
        )}

        {error && (
          <p ref={errorRef} className="text-red-500 text-sm text-center scroll-mt-24">
            {error}
          </p>
        )}

        <div className={`flex items-center w-full ${onSignOut ? 'justify-between' : 'justify-center'}`}>
          {onSignOut && (
            <button type="button" onClick={onSignOut} className="text-base font-bold text-[#b42124] hover:underline">
              Cancel &amp; Sign Out
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-4 bg-[#7235ed] text-white text-base font-bold rounded-full hover:bg-[#6029d1] disabled:opacity-50 transition-colors"
          >
            {submitting ? (isUpdate ? 'Updating...' : 'Submitting...') : isUpdate ? 'Update' : 'Submit'}
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
          . We&apos;ll only use your information for Devcon-related communications and won&apos;t share it with third
          parties.
        </p>
      </form>
    </FormProvider>
  )
}

export default function FormPage({ viewId, requireOtp, closed, formSlug }: FormPageProps) {
  const [schema, setSchema] = useState<SchemaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const methods = useForm<Record<string, any>>()
  const { walletProof } = useBuilderConnect()

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
              <FormHeaderImage />
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
              <FormHeaderImage />

              <h2 className="text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] text-center leading-[28.8px]">
                Thank you!
              </h2>

              <p className="text-sm text-[#1a0d33] leading-5 text-center">
                {schema?.successMsg ?? 'Your application has been submitted.'}
              </p>
              {formSlug === STUDENT_APPLICATION_SLUG && (
                <>
                  <div className="text-sm text-[#1a0d33] leading-5 text-center bg-[#f9f8fa] rounded-lg px-4 py-4 w-full">
                    <p className="font-bold mb-2">We review applications in two rounds:</p>
                    <ul className="list-disc list-outside pl-5 space-y-1 inline-block text-left">
                      <li>
                        <span className="font-bold">Round 1</span> — Apply by June 12, responses sent by July 15
                      </li>
                      <li>
                        <span className="font-bold">Round 2</span> — Apply by August 14, responses sent by September 7
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-[#1a0d33] leading-5 text-center">
                    Keep an eye on your email for a decision from our approval team.
                  </p>
                </>
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

      // Form data is keyed by sanitized RHF aliases (rhfFieldName); the server
      // expects original NocoDB column titles.
      const submitData = remapToOriginalNames(
        formData,
        schema!.columns.map(c => c.column_name)
      )

      // NocoDB MultiSelect columns expect a comma-separated string on write.
      for (const col of schema!.columns) {
        if (col.uidt !== 'MultiSelect') continue
        const v = submitData[col.column_name]
        if (Array.isArray(v)) {
          submitData[col.column_name] = v.join(',')
        }
      }

      const body: Record<string, unknown> = { data: submitData }
      if (walletProof) body.walletProof = walletProof

      const res = await fetch(`/api/nocodb/${viewId}/submit/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
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
            <OtpGate
              title={schema.title}
              subheading={schema.subheading}
              description={
                formSlug === STUDENT_APPLICATION_SLUG
                  ? 'Enter your student email to start the application'
                  : 'Enter your email to start the application'
              }
              emailPlaceholder={formSlug === STUDENT_APPLICATION_SLUG ? 'your@student.email.com' : 'your@email.com'}
              footer={formSlug === STUDENT_APPLICATION_SLUG ? <CriteriaEligibilityButton /> : null}
            >
              {(verifiedEmail, onSignOut) => {
                const inner = (
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
                    formSlug={formSlug}
                  />
                )

                // EligibilityGate hits /check-eligibility/, which classifies the
                // email against the student-application criteria (Indian student
                // domains, etc.). Other OTP-required forms shouldn't run that
                // check.
                if (formSlug === STUDENT_APPLICATION_SLUG) {
                  return (
                    <EligibilityGate email={verifiedEmail} viewId={viewId} onSignOut={onSignOut}>
                      {bucket => (
                        <>
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
                            bucket={bucket}
                            formSlug={formSlug}
                          />
                          <EmailClassifierDebug callerEmail={verifiedEmail} />
                        </>
                      )}
                    </EligibilityGate>
                  )
                }

                // Visa form: signed-in email must have a paid Pretix order.
                if (formSlug === VISA_FORM_SLUG) {
                  return (
                    <VisaTicketGate email={verifiedEmail} onSignOut={onSignOut}>
                      {() => inner}
                    </VisaTicketGate>
                  )
                }

                return inner
              }}
            </OtpGate>
          ) : (
            <>
              <FormHeaderImage />
              <h2 className="text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] text-center leading-[28.8px]">
                {schema.title}
              </h2>
              {/* schema.subheading is rendered inside FormInner so the OTP
                  post-signin path shows it too. */}
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
