import React, { useState, useEffect } from 'react'
import { supabase } from 'services/supabase-browser'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import dc8Logo from 'assets/images/dc-8/dc8-logo.png'
import { Mail } from 'lucide-react'
import { CriteriaEligibilityButton } from './CriteriaEligibilityButton'

interface OtpGateProps {
  children: (verifiedEmail: string, onSignOut: () => void) => React.ReactNode
  title?: string
}

// Hardcoded so the Supabase email template can branch on RedirectTo to render the
// code-based template instead of the magic-link template.
const EMAIL_REDIRECT_URL = 'https://devcon.org/form/student-application'

export function OtpGate({ children, title }: OtpGateProps) {
  const [step, setStep] = useState<'email' | 'code' | 'verified'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [verifiedEmail, setVerifiedEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase) return

    // If the URL has a hash with access_token/refresh_token, Supabase needs to exchange it.
    // We detect this, let Supabase process it, then clean the URL.
    const hasAuthHash = window.location.hash && window.location.hash.includes('access_token')

    if (hasAuthHash) {
      // Supabase auto-detects the hash via detectSessionInUrl (default: true).
      // Calling getSession() after it processes ensures we get the session,
      // then we can safely strip the hash.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          setVerifiedEmail(session.user.email)
          setStep('verified')
        }
        // Clean hash regardless — it's been consumed
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      })
    } else {
      // No auth hash — check for existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          setVerifiedEmail(session.user.email)
          setStep('verified')
        }
      })
    }

    // Also listen for future auth changes (e.g. token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setVerifiedEmail(session.user.email)
        setStep('verified')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!supabase) {
    return <p className="text-red-500">OTP verification is not configured.</p>
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase!.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: EMAIL_REDIRECT_URL },
      })
      if (err) throw err
      setStep('code')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase!.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      })
      if (err) throw err
      // onAuthStateChange handler will pick up the new session and move to 'verified'
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase!.auth.signOut()
    setVerifiedEmail('')
    setEmail('')
    setCode('')
    setStep('email')
    // Clean any leftover hash fragment so Supabase doesn't choke on stale tokens
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  if (step === 'email') {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <Image src={dc8Logo} alt="Devcon 8 India" width={127} height={56} />

        <h2 className="text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] text-center leading-[28.8px]">
          {title || 'Verify your email'}
        </h2>

        <form onSubmit={handleSendCode} className="flex flex-col gap-6 items-center w-full">
          <div className="flex flex-col gap-4 items-start w-full">
            <div className="flex flex-col gap-2 items-start w-full">
              <Label htmlFor="gate-email" className="text-base font-bold text-[#160b2b] leading-6">
                Email
              </Label>
              <p className="text-sm text-[#594d73] leading-5">
                Enter your student email to start the application
              </p>
            </div>
            <div className="relative w-full">
              <Mail
                aria-hidden
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#594d73] pointer-events-none"
                strokeWidth={1.75}
              />
              <Input
                id="gate-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@student.email.com"
                disabled={loading}
                required
                className="h-10 pl-10 pr-4 text-base border-[#dddae2] rounded-lg"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-[#7235ed] text-white text-base font-bold rounded-full hover:bg-[#6029d1] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send verification code'}
          </button>
        </form>

        <CriteriaEligibilityButton />
      </div>
    )
  }

  if (step === 'code') {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <Image src={dc8Logo} alt="Devcon 8 India" width={127} height={56} />

        <h2 className="text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] text-center leading-[28.8px]">
          Enter verification code
        </h2>

        <div className="flex flex-col gap-2 items-center py-4 px-4 rounded bg-[#f9f8fa] w-full text-center">
          <p className="text-sm text-[#1a0d33] leading-5">We sent a 6-digit code to:</p>
          <p className="text-xl font-extrabold text-[#1a0d33] leading-[26px] break-all">{email}</p>
        </div>

        <form onSubmit={handleVerifyCode} className="flex flex-col gap-6 items-center w-full">
          <div className="flex flex-col gap-2 items-start w-full">
            <Label htmlFor="gate-code" className="text-base font-bold text-[#160b2b] leading-6">
              Code
            </Label>
            <Input
              id="gate-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              disabled={loading}
              required
              className="h-10 pl-4 pr-4 text-base border-[#dddae2] rounded-lg tracking-widest"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="px-8 py-4 bg-[#7235ed] text-white text-base font-bold rounded-full hover:bg-[#6029d1] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setStep('email')
            setError('')
            setCode('')
          }}
          className="px-4 py-1.5 text-sm font-bold text-[#7235ed] hover:underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  // step === 'verified'
  return (
    <>
      <div className="flex flex-col items-center gap-6 w-full">
        <Image src={dc8Logo} alt="Devcon 8 India" width={127} height={56} />

        <h2 className="text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] text-center leading-[28.8px]">
          {title || 'Verify your email'}
        </h2>

        <div className="flex flex-col items-center gap-2 w-full px-4 py-3 bg-[#f9f8fa] rounded text-sm md:flex-row md:justify-between md:items-center md:gap-4">
          <div className="flex flex-col items-center gap-1 min-w-0 max-w-full md:flex-row md:items-baseline md:gap-1.5">
            <p className="text-[#1a0d33] shrink-0">Signed in as:</p>
            <p className="font-bold text-[#1a0d33] truncate max-w-full">{verifiedEmail}</p>
          </div>
          <p className="text-center whitespace-nowrap shrink-0 md:text-right">
            <span className="text-[#1a0d33]">Wrong email? </span>
            <button type="button" onClick={handleSignOut} className="font-bold text-[#7235ed] hover:underline">
              Start over
            </button>
          </p>
        </div>
      </div>

      {children(verifiedEmail, handleSignOut)}
    </>
  )
}
