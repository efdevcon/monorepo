import React, { useState } from 'react'
import Head from 'next/head'
import type { GetServerSideProps } from 'next'
import fs from 'fs'
import path from 'path'
import { OtpGate } from 'components/domain/nocodb-form/OtpGate'
import { supabase } from 'services/supabase-browser'

interface EmailTemplate {
  name: string
  subject: string
  html: string
}

interface Props {
  templates: Record<string, EmailTemplate>
}

function resolveN8nExpressions(html: string, name: string): string {
  let result = html.replace(/^=/, '')
  result = result.replace(/\{\{\s*\$json\.body\.data\.rows\[0\]\["Full Name"\]\s*\|\|\s*"Applicant"\s*\}\}/g, name || 'Applicant')
  return result
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const jsonPath = path.join(process.cwd(), 'src/scripts/n8n/devcon-student-application-email.json')
  const raw = fs.readFileSync(jsonPath, 'utf-8')
  const workflow = JSON.parse(raw)

  const templates: Record<string, EmailTemplate> = {}

  for (const node of workflow.nodes) {
    if (node.type === 'n8n-nodes-base.emailSend') {
      const key = node.name.includes('Approval') ? 'Validated' : 'Rejected'
      templates[key] = {
        name: node.name,
        subject: node.parameters.subject,
        html: node.parameters.html,
      }
    }
  }

  return { props: { templates } }
}

const ALLOWED_DOMAIN = '@ethereum.org'

function AdminContent({ templates, userEmail }: Props & { userEmail: string }) {
  const [template, setTemplate] = useState<'Validated' | 'Rejected'>('Validated')
  const [name, setName] = useState('Didier')
  const [email, setEmail] = useState('didier.krux@ethereum.org')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const current = templates[template]
  const previewHtml = current ? resolveN8nExpressions(current.html, name || 'Applicant') : '<p>Template not found</p>'

  const sendTest = async () => {
    setSending(true)
    setResult(null)

    try {
      const session = await supabase?.auth.getSession()
      const accessToken = session?.data?.session?.access_token
      const res = await fetch('/api/admin/test-student-email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ name: name || 'Test Applicant', email, status: template }),
      })
      const data = await res.json()
      setResult(data.success ? `Sent ${template} email to ${email}` : `Error: ${data.error}`)
    } catch (err: any) {
      setResult(`Error: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Student Email Preview</h1>
      <p style={{ fontSize: 14, color: '#a89bc2', marginBottom: 4 }}>
        Preview and send test emails through the n8n workflow.
      </p>
      <p style={{ fontSize: 12, color: '#6b5f80', marginBottom: 24 }}>
        Signed in as <strong style={{ color: '#a89bc2' }}>{userEmail}</strong> &middot; Templates from{' '}
        <code style={{ background: '#2a1f44', padding: '2px 6px', borderRadius: 4 }}>src/scripts/n8n/devcon-student-application-email.json</code>
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
          Template
          <select
            value={template}
            onChange={e => setTemplate(e.target.value as 'Validated' | 'Rejected')}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #444', background: '#2a1f44', color: '#fff', fontSize: 14 }}
          >
            <option value="Validated">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, flex: 1, minWidth: 160 }}>
          Name
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Applicant name"
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #444', background: '#2a1f44', color: '#fff', fontSize: 14 }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, flex: 1, minWidth: 200 }}>
          Send to
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="test@example.com"
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #444', background: '#2a1f44', color: '#fff', fontSize: 14 }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <button
          onClick={sendTest}
          disabled={sending || !email}
          style={{
            padding: '10px 24px',
            borderRadius: 9999,
            border: 'none',
            background: sending ? '#555' : '#7235ed',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: sending ? 'not-allowed' : 'pointer',
          }}
        >
          {sending ? 'Sending...' : 'Send Test Email'}
        </button>
        {result && (
          <span style={{ fontSize: 13, color: result.startsWith('Error') ? '#ff6b6b' : '#7de6a3' }}>{result}</span>
        )}
      </div>

      {current && (
        <p style={{ fontSize: 13, color: '#a89bc2', marginBottom: 24 }}>
          <strong>Subject:</strong> {current.subject}
        </p>
      )}

      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #333', background: '#fff' }}>
        <iframe
          srcDoc={previewHtml}
          style={{ width: '100%', height: 700, border: 'none' }}
          title="Email Preview"
        />
      </div>
    </div>
  )
}

export default function EmailPreviewPage({ templates }: Props) {
  return (
    <>
      <Head>
        <title>Email Preview — Devcon Admin</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#1a0d33', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
          <OtpGate>
            {verifiedEmail => {
              if (!verifiedEmail.endsWith(ALLOWED_DOMAIN)) {
                return (
                  <div style={{ textAlign: 'center', padding: '64px 16px' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Access Denied</h2>
                    <p style={{ fontSize: 14, color: '#a89bc2' }}>
                      Only <strong>{ALLOWED_DOMAIN}</strong> accounts can access this page.
                    </p>
                    <p style={{ fontSize: 13, color: '#6b5f80', marginTop: 8 }}>
                      Signed in as {verifiedEmail}
                    </p>
                  </div>
                )
              }

              return <AdminContent templates={templates} userEmail={verifiedEmail} />
            }}
          </OtpGate>
        </div>
      </div>
    </>
  )
}
