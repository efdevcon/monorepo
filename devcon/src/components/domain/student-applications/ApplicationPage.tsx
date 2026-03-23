import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from 'services/supabase-browser'
import EmailStep from './EmailStep'
import VoucherStep from './VoucherStep'
import FormStep from './FormStep'
import SubmittedStep from './SubmittedStep'
import AdminSection from './AdminSection'
import { isAdmin } from './config'

type Step = 'email' | 'magic-link-sent' | 'loading' | 'form' | 'voucher' | 'submitted'

interface Submission {
  name: string
  university: string
  yearOfStudy: string
  fieldOfStudy: string
  country: string
  essayProofOfWork: string
}

export default function ApplicationPage() {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email && (step === 'email' || step === 'magic-link-sent')) {
        const userEmail = session.user.email
        const token = session.access_token
        setEmail(userEmail)
        setAccessToken(token)

        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname)
        }

        if (isAdmin(userEmail)) {
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
    await supabase.auth.signOut()
    setStep('email')
    setEmail('')
    setAccessToken('')
    setVoucherCode('')
    setExistingSubmission(null)
    setError('')
  }

  return (
    <div style={{ maxWidth: isAdmin(email) && accessToken ? 1200 : 600, margin: '0 auto', paddingBottom: '3rem' }}>
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
