import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { supabase } from 'services/supabase-browser'

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
  signals: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  voucherCode: string | null
}

interface Props {
  accessToken: string
}

type SortKey = 'classification' | 'name' | 'email' | 'university' | 'country' | 'status' | 'createdAt'
type SortDir = 'asc' | 'desc'

const classificationRank = (s: Submission): number => {
  if (s.isUniversityEmail) return 0
  if (s.classificationType === 'university') return 1
  if (s.classificationType === 'organization') return 2
  if (s.classificationType === 'government') return 3
  if (s.classificationType === 'personal') return 4
  if (s.classificationType === 'disposable') return 5
  return 6
}

function compareSubmissions(a: Submission, b: Submission, key: SortKey, dir: SortDir): number {
  let cmp = 0

  switch (key) {
    case 'classification':
      cmp = classificationRank(a) - classificationRank(b)
      if (cmp === 0) cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      break
    case 'name':
      cmp = a.name.localeCompare(b.name)
      break
    case 'email':
      cmp = a.email.localeCompare(b.email)
      break
    case 'university':
      cmp = a.university.localeCompare(b.university)
      break
    case 'country':
      cmp = a.country.localeCompare(b.country)
      break
    case 'status': {
      const statusOrder: Record<string, number> = { pending: 0, approved: 1, rejected: 2 }
      cmp = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
      break
    }
    case 'createdAt':
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      break
  }

  return dir === 'desc' ? -cmp : cmp
}

async function getFreshToken(fallback: string): Promise<string> {
  const { data } = await supabase!.auth.getSession()
  return data.session?.access_token ?? fallback
}

export default function ReviewSection({ accessToken }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)
  const [granting, setGranting] = useState<number | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [voucherStats, setVoucherStats] = useState<{ total: number; assigned: number; available: number } | null>(null)

  const fetchSubmissions = async () => {
    setLoading(true)
    setError('')
    try {
      const token = await getFreshToken(accessToken)
      const res = await fetch('/api/student/submissions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load submissions')
      } else {
        setSubmissions(data.submissions)
        if (data.voucherStats) setVoucherStats(data.voucherStats)
      }
    } catch {
      setError('Failed to load submissions')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const sorted = useMemo(
    () => [...submissions].sort((a, b) => compareSubmissions(a, b, sortKey, sortDir)),
    [submissions, sortKey, sortDir],
  )

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'createdAt' ? 'desc' : 'asc')
    }
  }

  const updateStatus = async (id: number, status: 'approved' | 'rejected') => {
    setUpdating(id)
    try {
      const token = await getFreshToken(accessToken)
      const res = await fetch('/api/student/submissions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
    if (!confirm(`Are you sure you want to grant a voucher to ${email}?`)) return
    setGranting(submissionId)
    try {
      const token = await getFreshToken(accessToken)
      const res = await fetch('/api/student/grant-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok && data.voucherCode) {
        setSubmissions(prev =>
          prev.map(s => (s.id === submissionId ? { ...s, voucherCode: data.voucherCode, status: 'approved' as const } : s))
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
  const vouchers = submissions.filter(s => s.voucherCode)

  if (loading) return <p style={{ color: '#594d73' }}>Loading submissions...</p>
  if (error) return <p style={{ color: '#dc2626', fontWeight: 'bold' }}>{error}</p>

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return <span style={{ color: '#d1d5db', marginLeft: 4 }}>{'\u2195'}</span>
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#1a0d33' }}>
          Applications ({submissions.length} total, {pending.length} pending, {vouchers.length} vouchers granted)
        </h3>
        {voucherStats && (
          <span style={{ fontSize: '13px', color: voucherStats.available > 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
            {voucherStats.available} vouchers remaining (of {voucherStats.total})
          </span>
        )}
      </div>

      <style>{`
        .review-email { transition: transform 0.15s ease; }
        tr.review-row:hover .review-email { transform: translateX(5px); }
        tr.review-row { user-select: none; }
        tr.review-row button { user-select: auto; }
        .grant-btn { transition: background-color 0.15s ease, transform 0.15s ease; }
        .grant-btn:hover { background-color: #047857 !important; transform: scale(1.05); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {submissions.length === 0 ? (
        <p style={{ color: '#594d73', fontSize: '14px' }}>No submissions yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {([
                  ['createdAt', 'Date'],
                  ['email', 'Email'],
                  ['name', 'Name'],
                  ['classification', 'Classification'],
                  ['university', 'University'],
                  ['country', 'Country'],
                  ['status', 'Status'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    style={thStyle}
                  >
                    {label}{sortArrow(key)}
                  </th>
                ))}
                <th style={{ ...thStyle, cursor: 'default' }}>Actions</th>
                <th style={{ ...thStyle, cursor: 'default', textAlign: 'center' }}>Expand</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => (
                <React.Fragment key={s.id}>
                  <tr
                    className="review-row"
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    style={{
                      backgroundColor: s.voucherCode ? '#f0fdf4' : s.status === 'rejected' ? '#fef2f2' : '#fff',
                      borderBottom: expandedId === s.id ? 'none' : '1px solid #e5e7eb',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      {new Date(s.createdAt).toLocaleDateString(undefined, { timeZone: 'UTC' })}{' '}
                      {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC
                    </td>
                    <td className="review-email" style={tdStyle}>{s.email}</td>
                    <td style={tdStyle}>{s.name}</td>
                    <td style={tdStyle}>
                      <span style={{ ...classificationBadge, backgroundColor: classificationColor(s) }}>
                        {s.isUniversityEmail ? 'edu' : (s.classificationType ?? '\u2014')}
                      </span>
                    </td>
                    <td style={tdStyle}>{s.university}</td>
                    <td style={tdStyle}>{s.country}</td>
                    <td style={tdStyle}>
                      {s.voucherCode ? (
                        <span style={{ ...statusBadge, backgroundColor: '#059669' }}>Voucher granted</span>
                      ) : (
                        <span style={{ ...statusBadge, backgroundColor: statusColor[s.status] }}>{s.status}</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {!s.voucherCode && (
                          <button
                            className="grant-btn"
                            onClick={e => { e.stopPropagation(); grantVoucher(s.id, s.email) }}
                            disabled={granting === s.id}
                            style={{ ...actionButton, backgroundColor: granting === s.id ? '#9ca3af' : '#059669', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            {granting === s.id && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                            {granting === s.id ? 'Granting...' : 'Grant voucher'}
                          </button>
                        )}
                        {s.status !== 'rejected' && !s.voucherCode && (
                          <button
                            onClick={e => { e.stopPropagation(); updateStatus(s.id, 'rejected') }}
                            disabled={updating === s.id}
                            style={{ ...actionButton, backgroundColor: updating === s.id ? '#9ca3af' : '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            {updating === s.id && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                            {updating === s.id ? 'Rejecting...' : 'Reject'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7280' }}
                      >
                        {expandedId === s.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === s.id && (
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <td colSpan={9} style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 24px', fontSize: '13px', marginBottom: 12 }}>
                          <div><span style={detailLabel}>Year</span> {s.yearOfStudy}</div>
                          <div><span style={detailLabel}>Field</span> {s.fieldOfStudy}</div>
                          <div><span style={detailLabel}>Signals</span> {s.signals || '\u2014'}</div>
                        </div>
                        <div style={{ fontSize: '13px' }}>
                          <span style={detailLabel}>Essay / Proof of Work</span>
                          <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.5 }}>
                            {s.essayProofOfWork}
                          </p>
                        </div>
                        {s.voucherCode && (
                          <div style={{ marginTop: 12, padding: '8px 12px', backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '6px', fontSize: '13px', color: '#065f46', display: 'inline-block' }}>
                            Voucher: <strong style={{ letterSpacing: '1px' }}>{s.voucherCode}</strong>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1a0d33', margin: '2rem 0 1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e5e7eb' }}>Tools</h3>
      <ClassificationTester accessToken={accessToken} />
    </div>
  )
}

function ClassificationTester({ accessToken }: { accessToken: string }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setResult(null)
    try {
      const token = await getFreshToken(accessToken)
      const res = await fetch('/api/student/classify-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setResult(data.classification ?? data)
    } catch {
      setResult({ error: 'Request failed' })
    }
    setLoading(false)
  }

  return (
    <div style={{ marginTop: '2rem', padding: '1.5rem', border: '2px dashed #e5e7eb', borderRadius: '12px', backgroundColor: '#fafafa' }}>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '16px', color: '#1a0d33' }}>Classification Tester</h3>
      <p style={{ margin: '0 0 1rem', fontSize: '13px', color: '#594d73' }}>Test how any email would be classified.</p>
      <form onSubmit={handleTest} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="test@university.edu"
          required
          style={{ flex: 1, padding: '8px 12px', fontSize: '14px', border: '2px solid #ccc', borderRadius: '6px' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '8px 20px', fontSize: '14px', fontWeight: 600, color: '#fff', backgroundColor: loading ? '#9ca3af' : '#1a0d33', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Testing...' : 'Classify'}
        </button>
      </form>
      {result && (
        <pre style={{ marginTop: '1rem', padding: '12px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

function classificationColor(s: Submission): string {
  if (s.isUniversityEmail) return '#059669'
  switch (s.classificationType) {
    case 'university': return '#059669'
    case 'organization': return '#2563eb'
    case 'government': return '#7c3aed'
    case 'personal': return '#9ca3af'
    case 'disposable': return '#dc2626'
    default: return '#d1d5db'
  }
}

const statusColor: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#059669',
  rejected: '#dc2626',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '3px 8px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#1a0d33',
  borderBottom: '2px solid #e5e7eb',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  userSelect: 'none',
}

const tdStyle: React.CSSProperties = {
  padding: '3px 8px',
  fontSize: '12px',
  verticalAlign: 'middle',
}

const statusBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  borderRadius: '9999px',
  fontSize: '10px',
  fontWeight: 700,
  color: '#fff',
  textTransform: 'uppercase',
}

const classificationBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#fff',
}

const detailLabel: React.CSSProperties = {
  fontWeight: 600,
  color: '#1a0d33',
  marginRight: 4,
}

const actionButton: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}
