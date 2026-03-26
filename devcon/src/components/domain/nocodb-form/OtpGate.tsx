import React, { useState, useEffect } from 'react'
import { supabase } from 'services/supabase-browser'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface OtpGateProps {
  children: (verifiedEmail: string) => React.ReactNode
}

export function OtpGate({ children }: OtpGateProps) {
  const [step, setStep] = useState<'email' | 'link-sent' | 'verified'>('email')
  const [email, setEmail] = useState('')
  const [verifiedEmail, setVerifiedEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!supabase) {
    return <p className="text-red-500">OTP verification is not configured.</p>
  }

  // Listen for auth state change (fires when user clicks magic link and is redirected back)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        setVerifiedEmail(session.user.email)
        setStep('verified')
        // Clean up hash fragment from URL
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Check for existing session on mount (user may already be authenticated)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setVerifiedEmail(session.user.email)
        setStep('verified')
      }
    })
  }, [])

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
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

  if (step === 'email') {
    return (
      <form onSubmit={handleSendLink} className="space-y-4">
        <p className="text-sm text-neutral-600">Please verify your email to access this form.</p>
        <div className="space-y-1.5">
          <Label htmlFor="gate-email">Email</Label>
          <Input
            id="gate-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            required
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-lg hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send verification link'}
        </button>
      </form>
    )
  }

  if (step === 'link-sent') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          We sent a verification link to <strong>{email}</strong>. Click the link in your email to continue.
        </p>
        <button
          type="button"
          onClick={() => { setStep('email'); setError('') }}
          className="px-4 py-2 bg-white text-neutral-900 text-sm rounded-lg border border-neutral-200 hover:bg-neutral-50"
        >
          Use a different email
        </button>
      </div>
    )
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setVerifiedEmail('')
    setEmail('')
    setStep('email')
  }

  // step === 'verified'
  return (
    <>
      {children(verifiedEmail)}
      <div className="mt-6 pt-4 border-t border-neutral-200">
        <button
          type="button"
          onClick={handleSignOut}
          className="px-4 py-2 bg-white text-neutral-500 text-sm rounded-lg border border-neutral-200 hover:bg-neutral-50"
        >
          Cancel & sign out
        </button>
      </div>
    </>
  )
}
