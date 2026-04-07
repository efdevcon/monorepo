import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from 'services/supabase-browser'
import EmailStep from './EmailStep'
import VoucherStep from './VoucherStep'
import FormStep from './FormStep'
import SubmittedStep from './SubmittedStep'
import AdminSection from './AdminSection'
import { isAdmin } from './config'

type Step = 'email' | 'magic-link-sent' | 'loading' | 'form' | 'voucher' | 'submitted' | 'rejected'

interface Submission {
  name: string
  university: string
  yearOfStudy: string
  fieldOfStudy: string
  country: string
  essayProofOfWork: string
}

interface ApplicationPageProps {
  onAdminModeChange?: (isAdminMode: boolean) => void
}

export default function ApplicationPage({ onAdminModeChange }: ApplicationPageProps = {}) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null)
  const [error, setError] = useState('')

  const checkApplication = useCallback(async (token: string) => {
    setStep('loading')
    setError('')

    try {
      const res = await fetch('/api/student/my-application', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to load application status')
        setStep('form')
        return
      }

      if (data.submission && data.voucherCode) {
        setVoucherCode(data.voucherCode)
        setStep('voucher')
      } else if (data.submission?.status === 'rejected') {
        setStep('rejected')
      } else if (data.submission) {
        setExistingSubmission(data.submission)
        setStep('form')
      } else {
        setStep('form')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setStep('form')
    }
  }, [])

  // Pick up existing session (magic link redirect or page refresh)
  useEffect(() => {
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email && (step === 'email' || step === 'magic-link-sent')) {
        const userEmail = session.user.email
        let token = session.access_token

        // On page refresh (not fresh sign-in), validate the session is still alive
        if (event === 'INITIAL_SESSION') {
          const { data: refreshed, error: refreshError } = await supabase!.auth.getSession()

          if (refreshError || !refreshed.session?.access_token) {
            // Refresh token is dead — force logout so user isn't stuck in limbo
            await supabase!.auth.signOut()
            setStep('email')
            setEmail('')
            setAccessToken('')
            return
          }

          token = refreshed.session.access_token
        }

        setEmail(userEmail)
        setAccessToken(token)

        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname)
        }

        const adminMode = isAdmin(userEmail)
        onAdminModeChange?.(adminMode)

        if (adminMode) {
          setStep('form')
        } else {
          checkApplication(token)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [step, checkApplication])

  const handleMagicLinkSent = (sentEmail: string) => {
    setEmail(sentEmail)
    setStep('magic-link-sent')
  }

  const handleLogout = async () => {
    await supabase!.auth.signOut()
    setStep('email')
    setEmail('')
    setAccessToken('')
    setVoucherCode('')
    setExistingSubmission(null)
    setError('')
    onAdminModeChange?.(false)
  }

  return (
    <div style={{ maxWidth: isAdmin(email) && accessToken ? undefined : 600, margin: '0 auto', padding: isAdmin(email) && accessToken ? '2.5rem 2.5rem 3rem' : '0 0 3rem' }}>
      {step === 'email' && <EmailStep onMagicLinkSent={handleMagicLinkSent} />}

      {step === 'magic-link-sent' && (
        <>
          <h2>Check your inbox</h2>
          <p style={{ marginTop: '1rem' }}>
            We sent a magic link to <strong>{email}</strong>. Click the link in the email to continue.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#594d73', marginTop: '1rem' }}>
            Didn't receive it? Check your spam folder or{' '}
            <button
              onClick={() => { setStep('email'); setEmail('') }}
              style={{ background: 'none', border: 'none', color: '#7235ed', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}
            >
              try again
            </button>.
          </p>
        </>
      )}

      {step === 'loading' && (
        <>
          <h2>Loading your application...</h2>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div
              style={{
                display: 'inline-block',
                width: 40,
                height: 40,
                border: '4px solid #e5e7eb',
                borderTopColor: '#7235ed',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        </>
      )}

      {isAdmin(email) && accessToken ? (
        <AdminSection accessToken={accessToken} onLogout={handleLogout} email={email} />
      ) : (
        <>
          {step === 'rejected' && (
            <>
              <h2>Application Update</h2>
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '12px',
                  marginTop: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#991b1b' }}>
                  Your application was not approved
                </p>
              </div>
              <p>
                Thank you for applying for a student discount for Devcon India. After careful review, we were
                unfortunately unable to approve your application at this time.
              </p>
              <p>
                This may be due to limited availability or eligibility requirements. We encourage you to explore
                other ticket options, including community discounts and general admission.
              </p>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link
                  href="/tickets"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    backgroundColor: '#7235ed',
                    color: '#fff',
                    borderRadius: '9999px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  View ticket options
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '12px 24px',
                    background: 'none',
                    border: '1px solid #dddae2',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#594d73',
                  }}
                >
                  Sign in with a different email
                </button>
              </div>
            </>
          )}

          {step === 'voucher' && <VoucherStep email={email} voucherCode={voucherCode} onLogout={handleLogout} />}

          {step === 'form' && (
            <FormStep
              email={email}
              accessToken={accessToken}
              existingSubmission={existingSubmission}
              onSubmitted={() => setStep('submitted')}
              onLogout={handleLogout}
            />
          )}

          {step === 'submitted' && <SubmittedStep email={email} onLogout={handleLogout} />}

          {error && step !== 'loading' && (
            <p style={{ marginTop: '1rem', color: '#dc2626', fontWeight: 'bold' }}>{error}</p>
          )}
        </>
      )}
    </div>
  )
}
