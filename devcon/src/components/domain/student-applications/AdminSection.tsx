import React, { useState } from 'react'
import { isVoucherAdmin, isReviewerAdmin } from './config'
import ReviewSection from './ReviewSection'

interface Props {
  accessToken: string
  email: string
  onLogout: () => void
}

export default function AdminSection({ accessToken, email, onLogout }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const showVoucherImport = isVoucherAdmin(email)
  const showReview = isReviewerAdmin(email)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('loading')
    setMessage('')

    try {
      const text = await file.text()
      const codes = text
        .split(/[\n,]/)
        .map(line => line.trim())
        .filter(Boolean)

      if (codes.length === 0) {
        setStatus('error')
        setMessage('No voucher codes found in file')
        return
      }

      const res = await fetch('/api/student/import-vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ codes }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Import failed')
        return
      }

      setStatus('success')
      setMessage(`Imported ${data.inserted} voucher codes (${data.duplicates} duplicates skipped)`)
    } catch {
      setStatus('error')
      setMessage('Something went wrong')
    }

    e.target.value = ''
  }

  return (
    <>
      <h2>Admin</h2>

      <div
        style={{
          padding: '10px 14px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#92400e',
          marginTop: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Signed in as: <strong>{email}</strong></span>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#92400e', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
          Switch email
        </button>
      </div>

      {showVoucherImport && (
        <div
          style={{
            padding: '1.5rem',
            border: '2px dashed #e5e7eb',
            borderRadius: '12px',
            backgroundColor: '#fafafa',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '16px', color: '#1a0d33' }}>Import Voucher Codes</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '14px', color: '#594d73' }}>
            Upload a CSV file with one voucher code per line. Duplicates are skipped.
          </p>

          <label
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: status === 'loading' ? '#9ca3af' : '#1a0d33',
              borderRadius: '8px',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            }}
          >
            {status === 'loading' ? 'Importing...' : 'Choose CSV file'}
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              disabled={status === 'loading'}
              style={{ display: 'none' }}
            />
          </label>

          {message && (
            <p
              style={{
                marginTop: '0.75rem',
                fontSize: '14px',
                fontWeight: 600,
                color: status === 'success' ? '#065f46' : '#dc2626',
              }}
            >
              {message}
            </p>
          )}
        </div>
      )}

      {showReview && <ReviewSection accessToken={accessToken} />}
    </>
  )
}
