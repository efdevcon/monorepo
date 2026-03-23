import React, { useState } from 'react'
import { supabase } from 'services/supabase-browser'

interface Props {
  onOtpSent: (email: string) => void
}

export default function EmailStep({ onOtpSent }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/applications` },
    })

    if (otpError) {
      setError(otpError.message)
      setLoading(false)
    } else {
      onOtpSent(email)
    }
  }

  return (
    <>
      <h2>Student Discount Application</h2>
      <p style={{ marginTop: '1rem' }}>
        Enter your email address below. We will send you a verification code to confirm your identity before proceeding.
      </p>
      <p style={{ fontSize: '0.9rem', color: '#594d73' }}>
        If you have a university email address (.edu, .ac.uk, etc.), use it for faster processing.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@university.edu"
          required
          style={inputStyle}
        />
        <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Sending code...' : 'Send verification code'}
        </button>
      </form>

      {error && <p style={{ marginTop: '1rem', color: '#dc2626', fontWeight: 'bold' }}>{error}</p>}
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  fontSize: '16px',
  border: '2px solid #ccc',
  borderRadius: '8px',
  marginBottom: '1rem',
  boxSizing: 'border-box',
}

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#fff',
  backgroundColor: '#7235ed',
  border: 'none',
  borderRadius: '8px',
}
