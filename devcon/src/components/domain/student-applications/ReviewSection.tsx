import React, { useEffect, useState } from 'react'

interface Submission {
  id: number
  email: string
  name: string
  university: string
  yearOfStudy: string
  fieldOfStudy: string
  country: string
  essayProofOfWork: string
  classificationType: string | null
  classificationDomain: string | null
  isUniversityEmail: boolean
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  voucherCode: string | null
}

interface Props {
  accessToken: string
}

export default function ReviewSection({ accessToken }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)
  const [granting, setGranting] = useState<number | null>(null)

  const fetchSubmissions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/student/submissions', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load submissions')
      } else {
        setSubmissions(data.submissions)
      }
    } catch {
      setError('Failed to load submissions')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const updateStatus = async (id: number, status: 'approved' | 'rejected') => {
    setUpdating(id)
    try {
      const res = await fetch('/api/student/submissions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setSubmissions(prev => prev.map(s => (s.id === id ? { ...s, status } : s)))
      }
    } catch {
      // ignore
    }
    setUpdating(null)
  }

  const grantVoucher = async (submissionId: number, email: string) => {
    setGranting(submissionId)
    try {
      const res = await fetch('/api/student/grant-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok && data.voucherCode) {
        setSubmissions(prev =>
          prev.map(s => (s.id === submissionId ? { ...s, voucherCode: data.voucherCode } : s))
        )
      } else {
        alert(data.error || 'Failed to grant voucher')
      }
    } catch {
      alert('Failed to grant voucher')
    }
    setGranting(null)
  }

  const pending = submissions.filter(s => s.status === 'pending')
  const reviewed = submissions.filter(s => s.status !== 'pending')

  if (loading) return <p style={{ color: '#594d73' }}>Loading submissions...</p>
  if (error) return <p style={{ color: '#dc2626', fontWeight: 'bold' }}>{error}</p>

  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '16px', color: '#1a0d33' }}>
        Applications ({pending.length} pending, {reviewed.length} reviewed)
      </h3>

      {submissions.length === 0 && (
        <p style={{ color: '#594d73', fontSize: '14px' }}>No submissions yet.</p>
      )}

      {submissions.map(s => (
        <div
          key={s.id}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '8px',
            backgroundColor: s.voucherCode ? '#f0fdf4' : s.status === 'approved' ? '#f0fdf4' : s.status === 'rejected' ? '#fef2f2' : '#fff',
          }}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
          >
            <div>
              <strong>{s.name}</strong>
              <span style={{ color: '#594d73', fontSize: '13px', marginLeft: '8px' }}>{s.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {s.voucherCode && (
                <span style={{ ...statusBadge, backgroundColor: '#7235ed' }}>voucher</span>
              )}
              <span style={{ ...statusBadge, backgroundColor: statusColor[s.status] }}>{s.status}</span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{expandedId === s.id ? '\u25B2' : '\u25BC'}</span>
            </div>
          </div>

          {expandedId === s.id && (
            <div style={{ marginTop: '12px', fontSize: '14px', lineHeight: 1.6 }}>
              <div style={fieldRow}><span style={fieldLabel}>University</span> {s.university}</div>
              <div style={fieldRow}><span style={fieldLabel}>Year</span> {s.yearOfStudy}</div>
              <div style={fieldRow}><span style={fieldLabel}>Field</span> {s.fieldOfStudy}</div>
              <div style={fieldRow}><span style={fieldLabel}>Country</span> {s.country}</div>
              <div style={fieldRow}>
                <span style={fieldLabel}>Classification</span> {s.classificationType ?? '\u2014'}
                {s.classificationDomain && <span style={{ color: '#9ca3af' }}> ({s.classificationDomain})</span>}
                {s.isUniversityEmail && <span style={{ marginLeft: '4px', color: '#059669' }}>edu</span>}
              </div>
              <div style={{ ...fieldRow, flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={fieldLabel}>Essay / Proof of Work</span>
                <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', color: '#374151' }}>{s.essayProofOfWork}</p>
              </div>

              {s.voucherCode && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #6ee7b7',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#065f46',
                  }}
                >
                  Voucher granted: <strong style={{ letterSpacing: '1px' }}>{s.voucherCode}</strong>
                </div>
              )}

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => updateStatus(s.id, 'approved')}
                  disabled={updating === s.id || s.status === 'approved'}
                  style={{
                    ...actionButton,
                    backgroundColor: s.status === 'approved' ? '#d1d5db' : '#059669',
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(s.id, 'rejected')}
                  disabled={updating === s.id || s.status === 'rejected'}
                  style={{
                    ...actionButton,
                    backgroundColor: s.status === 'rejected' ? '#d1d5db' : '#dc2626',
                  }}
                >
                  Reject
                </button>
                {!s.voucherCode && (
                  <button
                    onClick={() => grantVoucher(s.id, s.email)}
                    disabled={granting === s.id}
                    style={{
                      ...actionButton,
                      backgroundColor: granting === s.id ? '#d1d5db' : '#7235ed',
                    }}
                  >
                    {granting === s.id ? 'Granting...' : 'Grant Voucher'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const statusColor: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#059669',
  rejected: '#dc2626',
}

const statusBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '9999px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#fff',
  textTransform: 'uppercase',
}

const fieldRow: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'baseline',
  marginBottom: '4px',
}

const fieldLabel: React.CSSProperties = {
  fontWeight: 600,
  color: '#1a0d33',
  minWidth: '100px',
  flexShrink: 0,
}

const actionButton: React.CSSProperties = {
  padding: '6px 16px',
  fontSize: '13px',
  fontWeight: 600,
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
}
