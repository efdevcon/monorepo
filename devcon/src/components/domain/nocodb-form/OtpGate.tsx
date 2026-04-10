import React, { useState, useEffect } from 'react'
import { supabase } from 'services/supabase-browser'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import dc8Logo from 'assets/images/dc-8/dc8-logo.png'
import { ArrowRight } from 'lucide-react'

interface OtpGateProps {
  children: (verifiedEmail: string, onSignOut: () => void) => React.ReactNode
  title?: string
}

export function OtpGate({ children, title }: OtpGateProps) {
  const [step, setStep] = useState<'email' | 'link-sent' | 'verified'>('email')
  const [email, setEmail] = useState('')
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase!.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      })
      if (err) throw err
      setStep('link-sent')
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
    setStep('email')
    // Clean any leftover hash fragment so Supabase doesn't choke on stale tokens
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  if (step === 'email') {
    return (
      <div className="flex flex-col items-center gap-4">
        <Image src={dc8Logo} alt="Devcon 8 India" width={127} height={56} />

        <h2 className="text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] text-center leading-[28.8px]">
          {title || 'Verify your email'}
        </h2>

        <p className="text-sm text-[#1a0d33] text-center leading-5">
          Enter your email to verify your identity
        </p>

        <form onSubmit={handleSendLink} className="flex flex-col gap-6 items-center w-full">
          <div className="w-full">
            <div className="space-y-3">
              <Label htmlFor="gate-email" className="text-base font-bold text-[#160b2b]">Email</Label>
              <Input
                id="gate-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@education.email.com"
                disabled={loading}
                required
                className="h-10 px-4 text-base border-[#dddae2] rounded-lg"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-[#7235ed] text-white text-base font-bold rounded-full hover:bg-[#6029d1] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send verification link'}
          </button>
        </form>

        <a
          href="/tickets"
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold text-[#7235ed] hover:underline"
        >
          Learn more about eligibility
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    )
  }

  if (step === 'link-sent') {
    return (
      <div className="flex flex-col items-center gap-4">
        <Image src={dc8Logo} alt="Devcon 8 India" width={127} height={56} />

        <h2 className="text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] text-center leading-[28.8px]">
          Check your email
        </h2>

        <p className="text-sm text-[#1a0d33] text-center leading-5">
          We sent a verification link to <strong>{email}</strong>. Click the link in your email to continue.
        </p>

        <button
          type="button"
          onClick={() => { setStep('email'); setError('') }}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold text-[#7235ed] hover:underline"
        >
          Use a different email
          <ArrowRight className="w-4 h-4" />
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

        <div className="flex items-center justify-between w-full px-4 py-3 bg-[#f9f8fa] rounded text-sm whitespace-nowrap">
          <p className="text-[#1a0d33]">
            Signed in as <strong>{verifiedEmail}</strong>
          </p>
          <p className="text-right ml-4">
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
