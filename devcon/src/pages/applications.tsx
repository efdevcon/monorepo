import React, { useState } from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import HeroBackground from 'assets/images/pages/hero-bgs/news.jpg'

export default function Applications() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const apiBase = process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : 'https://api.devcon.org'
      const response = await fetch(`${apiBase}/whitelist/send-form-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.data?.formUrl) {
          // Form URL returned (non-whitelisted, or dev mode) — open directly
          window.open(data.data.formUrl, '_blank')
          setStatus('success')
          setMessage('The application form has been opened in a new tab.')
        } else if (data.data?.whitelisted) {
          // Whitelisted, email sent
          setStatus('success')
          setMessage('Check your inbox! We sent you a link to the application form.')
        }
      } else {
        setStatus('error')
        setMessage(data.message || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <Page theme={themes['news']}>
      <PageHero heroBackground={HeroBackground} path={[{ text: 'Applications' }]} />

      <div className="section">
        <div className="content" style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2>Apply to Devcon</h2>
          <p>Enter your email address below to access the application form. If your organization is pre-approved, we will email you a verified link. Otherwise, the form will open directly.</p>

          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@organization.com"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #ccc',
                borderRadius: '8px',
                marginBottom: '1rem',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: '#30354b',
                border: 'none',
                borderRadius: '8px',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
              }}
            >
              {status === 'loading' ? 'Sending...' : 'Send me the application form'}
            </button>
          </form>

          {status === 'success' && (
            <p style={{ marginTop: '1rem', color: '#16a34a', fontWeight: 'bold' }}>{message}</p>
          )}
          {status === 'error' && (
            <p style={{ marginTop: '1rem', color: '#dc2626', fontWeight: 'bold' }}>{message}</p>
          )}
        </div>
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
