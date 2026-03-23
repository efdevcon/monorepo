import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from 'services/supabase-browser'
import EmailStep from './EmailStep'
import OtpStep from './OtpStep'
import VoucherStep from './VoucherStep'
import FormStep from './FormStep'
import SubmittedStep from './SubmittedStep'
import AdminSection from './AdminSection'
import { isAdmin } from './config'

type Step = 'email' | 'otp' | 'loading' | 'form' | 'voucher' | 'submitted'

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
        // Voucher granted — show read-only voucher view
        setVoucherCode(data.voucherCode)
        setStep('voucher')
      } else if (data.submission) {
        // Existing submission, no voucher — edit mode
        setExistingSubmission(data.submission)
        setStep('form')
      } else {
        // No submission — blank form
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
      if (session?.user?.email && step === 'email') {
        const userEmail = session.user.email
        const token = session.access_token
        setEmail(userEmail)
        setAccessToken(token)

        // Clean up hash fragment from magic link
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname)
        }

        if (isAdmin(userEmail)) {
          setStep('form') // skip check, show admin UI
        } else {
          checkApplication(token)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [step, checkApplication])

  const handleOtpSent = (sentEmail: string) => {
    setEmail(sentEmail)
    setStep('otp')
  }

  const handleVerified = (token: string) => {
    setAccessToken(token)
    if (isAdmin(email)) {
      setStep('form')
    } else {
      checkApplication(token)
    }
  }

  const handleBack = () => {
    setStep('email')
    setEmail('')
    setError('')
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
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: '3rem' }}>
      {step === 'email' && <EmailStep onOtpSent={handleOtpSent} />}

      {step === 'otp' && <OtpStep email={email} onVerified={handleVerified} onBack={handleBack} />}

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
