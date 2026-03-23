import React, { useState } from 'react'
import { supabase } from 'services/supabase-browser'

interface Props {
  email: string
  onVerified: (accessToken: string) => void
  onBack: () => void
}

export default function OtpStep({ email, onVerified, onBack }: Props) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: verifyError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })

    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
    } else if (data.session?.access_token) {
      onVerified(data.session.access_token)
    } else {
      setError('Verification succeeded but no session was created. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <h2>Enter Verification Code</h2>
      <p>
        We sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your email.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          required
          style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.5em', fontSize: '24px' }}
        />
        <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Verifying...' : 'Verify code'}
        </button>
      </form>

      <button onClick={onBack} style={linkButtonStyle}>
        Use a different email
      </button>

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

const linkButtonStyle: React.CSSProperties = {
  marginTop: '1rem',
  background: 'none',
  border: 'none',
  color: '#7235ed',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontSize: '14px',
}
