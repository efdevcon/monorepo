import React, { useState } from 'react'
import { supabase } from 'services/supabase-browser'

interface Props {
  onMagicLinkSent: (email: string) => void
}

export default function EmailStep({ onMagicLinkSent }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/applications` },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      onMagicLinkSent(email)
    }
  }

  return (
    <>
      <h2>Student Discount Application</h2>
      <p style={{ marginTop: '1rem' }}>
        Enter your email to apply or check on an existing application. We will send you a magic link to sign in.
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
          {loading ? 'Sending...' : 'Send magic link'}
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
