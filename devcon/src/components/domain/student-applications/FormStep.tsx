import React, { useState } from 'react'

interface Submission {
  name: string
  university: string
  yearOfStudy: string
  fieldOfStudy: string
  country: string
  essayProofOfWork: string
}

interface Props {
  email: string
  accessToken: string
  existingSubmission?: Submission | null
  onSubmitted: () => void
  onLogout: () => void
}

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Masters', 'PhD', 'Postdoc']

export default function FormStep({ email, accessToken, existingSubmission, onSubmitted, onLogout }: Props) {
  const isEditing = !!existingSubmission
  const [form, setForm] = useState({
    name: existingSubmission?.name ?? '',
    university: existingSubmission?.university ?? '',
    yearOfStudy: existingSubmission?.yearOfStudy ?? '',
    fieldOfStudy: existingSubmission?.fieldOfStudy ?? '',
    country: existingSubmission?.country ?? '',
    essayProofOfWork: existingSubmission?.essayProofOfWork ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/student/submit-application', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      onSubmitted()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <h2>Student Discount Application</h2>

      <div
        style={{
          padding: '10px 14px',
          backgroundColor: '#eff6ff',
          border: '1px solid #93c5fd',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#1e40af',
          marginTop: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Applying as: <strong>{email}</strong></span>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#1e40af', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
          Switch email
        </button>
      </div>

      {isEditing && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#92400e',
            marginBottom: '1.5rem',
          }}
        >
          You have an existing application. Feel free to update your details below — changes are saved when you click Update.
        </div>
      )}

      <p>
        Fill in the form below to apply for a student discount ticket. Applications are reviewed manually.
        You can return to this page at any time to check your status or update your submission.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <label style={labelStyle}>Full Name</label>
        <input
          type="text"
          value={form.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Your full name"
          required
          style={inputStyle}
        />

        <label style={labelStyle}>University / Organization</label>
        <input
          type="text"
          value={form.university}
          onChange={e => update('university', e.target.value)}
          placeholder="e.g. MIT, ETH Zurich"
          required
          style={inputStyle}
        />

        <label style={labelStyle}>Year of Study</label>
        <select
          value={form.yearOfStudy}
          onChange={e => update('yearOfStudy', e.target.value)}
          required
          style={inputStyle}
        >
          <option value="" disabled>Select year of study</option>
          {YEAR_OPTIONS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <label style={labelStyle}>Field of Study</label>
        <input
          type="text"
          value={form.fieldOfStudy}
          onChange={e => update('fieldOfStudy', e.target.value)}
          placeholder="e.g. Computer Science, Economics"
          required
          style={inputStyle}
        />

        <label style={labelStyle}>Country</label>
        <input
          type="text"
          value={form.country}
          onChange={e => update('country', e.target.value)}
          placeholder="Your country of residence"
          required
          style={inputStyle}
        />

        <label style={labelStyle}>Why do you want to attend Devcon? (Proof of Work)</label>
        <textarea
          value={form.essayProofOfWork}
          onChange={e => { if (e.target.value.length <= 500) update('essayProofOfWork', e.target.value) }}
          placeholder="Tell us about your involvement in the Ethereum ecosystem, relevant projects, or why attending Devcon matters to you..."
          required
          maxLength={500}
          rows={5}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <p style={{ margin: '-0.75rem 0 1rem', fontSize: '12px', color: form.essayProofOfWork.length >= 450 ? '#dc2626' : '#9ca3af', textAlign: 'right' }}>
          {form.essayProofOfWork.length}/500
        </p>

        <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update Application' : 'Submit Application')}
        </button>
      </form>

      {error && <p style={{ marginTop: '1rem', color: '#dc2626', fontWeight: 'bold' }}>{error}</p>}
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  color: '#1a0d33',
  marginBottom: '4px',
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
