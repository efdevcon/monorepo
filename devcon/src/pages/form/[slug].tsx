import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useForm, FormProvider } from 'react-hook-form'
import Page from 'components/common/layouts/page'
import { FormRenderer, type FormColumn } from 'components/domain/nocodb-form/FormRenderer'
import { OtpGate } from 'components/domain/nocodb-form/OtpGate'
import { nocodbForms } from 'config/nocodb-forms'
import { supabase } from 'services/supabase-browser'

interface SchemaResponse {
  title: string
  columns: FormColumn[]
}

// Inner form component — handles setValue in useEffect (not during render)
function FormInner({
  schema,
  methods,
  onSubmit,
  submitting,
  error,
  verifiedEmail,
  slug,
}: {
  schema: SchemaResponse
  methods: ReturnType<typeof useForm<Record<string, any>>>
  onSubmit: (data: Record<string, any>) => Promise<void>
  submitting: boolean
  error: string
  verifiedEmail?: string
  slug: string
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

    // Fetch existing submission to pre-fill
    setLoadingExisting(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) {
        setLoadingExisting(false)
        return
      }

      fetch(`/api/nocodb/${slug}/submission/`, {
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
  }, [verifiedEmail, schema.columns, methods, slug])

  if (loadingExisting) {
    return <p>Loading your submission...</p>
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
        <FormRenderer columns={schema.columns} readOnlyFields={readOnlyFields} />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-neutral-900 text-white text-sm rounded-lg hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? (isUpdate ? 'Updating...' : 'Submitting...') : (isUpdate ? 'Update Application' : 'Submit')}
        </button>
      </form>
    </FormProvider>
  )
}

export default function NocodbFormPage() {
  const router = useRouter()
  const slug = router.query.slug as string | undefined

  const [schema, setSchema] = useState<SchemaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const methods = useForm<Record<string, any>>()

  useEffect(() => {
    if (!slug) return

    setLoading(true)
    setError('')

    fetch(`/api/nocodb/${slug}/schema/`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load form')
        setSchema(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  // slug is validated by getStaticProps (returns 404 for unknown slugs)
  const config = slug ? nocodbForms[slug] : undefined

  if (loading || !slug) {
    return (
      <Page>
        <div className="section clear-top clear-bottom">
          <div className="flex flex-col items-center">
            <p>Loading...</p>
          </div>
        </div>
      </Page>
    )
  }

  if (error) {
    return (
      <Page>
        <div className="section clear-top clear-bottom">
          <div className="flex flex-col items-center">
            <h2>Error</h2>
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </Page>
    )
  }

  if (submitted) {
    return (
      <Page>
        <div className="section clear-top clear-bottom">
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2>Application Submitted</h2>

            <div
              style={{
                padding: '20px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #6ee7b7',
                borderRadius: '12px',
                marginTop: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#065f46' }}>
                Thank you for applying!
              </p>
            </div>

            <p>
              Your application has been submitted for review. You can return to this page at any time to
              update your application — just sign in with the same email.
            </p>
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

      // Include Supabase auth token if available (for forms with requireOtp)
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      }

      const res = await fetch(`/api/nocodb/${slug}/submit/`, {
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
    <Page>
      <div className="section clear-top clear-bottom">
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 className="mb-6">{schema.title}</h2>

          {config?.requireOtp ? (
            <OtpGate>
              {verifiedEmail => (
                <FormInner
                  schema={schema}
                  methods={methods}
                  onSubmit={onSubmit}
                  submitting={submitting}
                  error={error}
                  verifiedEmail={verifiedEmail}
                  slug={slug}
                />
              )}
            </OtpGate>
          ) : (
            <FormInner
              schema={schema}
              methods={methods}
              onSubmit={onSubmit}
              submitting={submitting}
              error={error}
              slug={slug}
            />
          )}
        </div>
      </div>
    </Page>
  )
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps({ params }: any) {
  const slug = params?.slug as string
  if (!nocodbForms[slug]) return { notFound: true }
  return { props: {}, revalidate: 86400 }
}
