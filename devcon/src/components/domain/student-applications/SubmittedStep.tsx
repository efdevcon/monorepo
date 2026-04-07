import React from 'react'

interface Props {
  email: string
  onLogout: () => void
}

export default function SubmittedStep({ email, onLogout }: Props) {
  return (
    <>
      <h2>Application Submitted</h2>

      <div
        style={{
          padding: '20px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #6ee7b7',
          borderRadius: '12px',
          marginTop: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#065f46' }}>
          Thank you for applying!
        </p>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#065f46', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
          Switch email
        </button>
      </div>

      <p>
        Your application has been submitted for review. You can return to this page at any time to check your
        status or update your application — just sign in with <strong>{email}</strong>.
      </p>
    </>
  )
}
