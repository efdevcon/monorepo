import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Page from 'components/common/layouts/page'
import type { TalentInfo } from 'services/builder/talent'
import type { GithubProfile } from 'services/builder/github-profile'
import type { DevfolioInfo } from 'services/builder/devfolio'
import type { EthglobalProject } from 'services/builder/ethglobal'
import {
  Github,
  Globe,
  Wallet,
  Award,
  Star,
  Check,
  X,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

const ADMIN_KEY_STORAGE = 'x402_admin_secret'

interface AutoDiscount {
  type: string
  name: string
  discount: number // 100 = free, else % off
}

interface ExistingVoucher {
  code: string
  collection: string
  assignedTo: string
}

interface MatchedRepo {
  repo: string
  project?: string
  stars?: number | null
  list?: 'web2' | 'web3' | 'core'
  ecosystems?: string[]
  source: string
}

type Decision = 'Approved' | 'Rejected'

// One distinct colour per match type.
const BADGE_CLS = {
  core: 'bg-[#e6f7ed] text-[#137a3e] border-[#b7e6c9]', // EF / Ethereum core repo — green
  oss: 'bg-[#e8efff] text-[#1d4ed8] border-[#c2d4fb]', // OSS / web2 list — blue
  web3: 'bg-[#e0f7fa] text-[#0e7490] border-[#b3e5ec]', // web3 list — cyan/teal
  notable: 'bg-[#f3f0ff] text-[#7235ed] border-[#decffb]', // notable (stars) — purple
  unverified: 'bg-[#fff5e6] text-[#a86510] border-[#f3d9ad]', // unverified claim — amber
} as const

// Contribution match types, in priority order. Each is its own group in the UI
// with a coloured label + an inline description.
const CONTRIB_GROUPS: { label: string; cls: string; desc: string; match: (r: MatchedRepo) => boolean }[] = [
  {
    label: 'EF / Ethereum repo',
    cls: BADGE_CLS.core,
    desc: 'In the efdevcon / ethereum orgs or a core client — a direct Ethereum / Devcon contribution.',
    match: r => r.source === 'list' && r.list === 'core',
  },
  {
    label: 'OSS list',
    cls: BADGE_CLS.oss,
    desc: 'In the curated list of significant open-source (web2) projects.',
    match: r => r.source === 'list' && r.list === 'web2',
  },
  {
    label: 'web3 list',
    cls: BADGE_CLS.web3,
    desc: 'In the curated web3 / Ethereum-ecosystem list.',
    match: r => r.source === 'list' && r.list === 'web3',
  },
  {
    label: 'Notable',
    cls: BADGE_CLS.notable,
    desc: 'Not listed, but a significant repo by GitHub stars.',
    match: r => r.source === 'github',
  },
  {
    label: 'Unverified',
    cls: BADGE_CLS.unverified,
    desc: "Claimed by the applicant, but we couldn't confirm they contributed (commits / PRs).",
    match: r => r.source === 'unverified',
  },
]

// Colour a "Match Source" summary key (e.g. "EF/Ethereum", "OSS", "web3",
// "notable", "unverified") with the same palette as the contribution groups.
function matchSummaryCls(key: string): string {
  const k = key.toLowerCase()
  if (k.includes('ef') || k.includes('ethereum') || k.includes('core')) return BADGE_CLS.core
  if (k.includes('oss') || k.includes('web2')) return BADGE_CLS.oss
  if (k.includes('web3')) return BADGE_CLS.web3
  if (k.includes('notable')) return BADGE_CLS.notable
  if (k.includes('unverified')) return BADGE_CLS.unverified
  return 'bg-[#f1eff4] text-[#3b3450] border-[#dddae2]'
}

// Parse a "2 EF/Ethereum, 1 OSS" summary (count first) into [{ label, count }]
// pairs. The fallback "no matches" has no count.
function parseMatchSummary(s: string): { label: string; count: string }[] {
  return s
    .split(',')
    .map(part => {
      const m = part.trim().match(/^(\d+)\s+(.+)$/)
      if (m) return { label: m[2].trim(), count: m[1] }
      const label = part.trim()
      return label ? { label, count: '' } : null
    })
    .filter((p): p is { label: string; count: string } => p !== null)
}

// Normalize a repo reference (URL or owner/name) to lowercased "owner/name", or null.
function normRepo(s: string): string | null {
  const t = s
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^github\.com\//i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
  const parts = t.split('/')
  if (parts.length < 2 || !parts[0] || !parts[1]) return null
  return `${parts[0]}/${parts[1]}`.toLowerCase().replace(/\.git$/, '')
}

function decisionPill(decision: string | undefined): { label: string; cls: string } {
  switch (decision) {
    case 'Approved':
      return { label: 'Approved', cls: 'bg-[#e6f7ed] text-[#137a3e] border-[#b7e6c9]' }
    case 'Rejected':
      return { label: 'Rejected', cls: 'bg-[#fdeaea] text-[#b42124] border-[#f3c2c2]' }
    default:
      return { label: decision || 'Pending', cls: 'bg-[#fff5e6] text-[#a86510] border-[#f3d9ad]' }
  }
}

/** A labelled external link chip; renders nothing when the value is empty. */
function LinkChip({ icon, label, value, href }: { icon: React.ReactNode; label: string; value?: string; href?: string }) {
  if (!value) return null
  const content = (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#dddae2] bg-[#f9f8fa] text-sm text-[#160b2b] max-w-full">
      <span className="text-[#7235ed] shrink-0">{icon}</span>
      <span className="text-[#594d73] shrink-0">{label}:</span>
      <span className="truncate font-medium">{value}</span>
      {href && <ExternalLink className="w-3.5 h-3.5 text-[#594d73] shrink-0" />}
    </span>
  )
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity max-w-full">
      {content}
    </a>
  ) : (
    content
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#594d73]">{title}</h2>
      {children}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg border border-[#dddae2] bg-[#f9f8fa]">
      <span className="text-lg font-extrabold text-[#160b2b]">{value}</span>
      <span className="text-xs text-[#594d73]">{label}</span>
    </div>
  )
}

function Essay({ label, text }: { label: string; text?: string }) {
  if (!text) return null
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-bold text-[#160b2b]">{label}</p>
      <p className="text-sm text-[#3b3450] leading-6 whitespace-pre-line">{text}</p>
    </div>
  )
}

export default function BuilderReviewPage() {
  const router = useRouter()
  const id = typeof router.query.id === 'string' ? router.query.id : undefined

  const [secret, setSecret] = useState<string | null>(null)
  const [secretInput, setSecretInput] = useState('')
  const [record, setRecord] = useState<Record<string, any> | null>(null)
  const [matchedRepos, setMatchedRepos] = useState<MatchedRepo[]>([])
  const [talent, setTalent] = useState<TalentInfo | null>(null)
  const [github, setGithub] = useState<GithubProfile | null>(null)
  const [devfolio, setDevfolio] = useState<DevfolioInfo | null>(null)
  const [ethglobal, setEthglobal] = useState<EthglobalProject[]>([])
  const [pastDevcons, setPastDevcons] = useState<string[]>([])
  const [autoDiscounts, setAutoDiscounts] = useState<AutoDiscount[]>([])
  const [existingVoucher, setExistingVoucher] = useState<ExistingVoucher | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState(false)
  const [actionResult, setActionResult] = useState<string | null>(null)

  useEffect(() => {
    const s = sessionStorage.getItem(ADMIN_KEY_STORAGE)
    if (s) setSecret(s)
  }, [])

  const load = useCallback(
    async (key: string) => {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/builder/review/${id}`, {
          headers: { 'x-admin-key': key },
          cache: 'no-store',
        })
        if (res.status === 401) {
          sessionStorage.removeItem(ADMIN_KEY_STORAGE)
          setSecret(null)
          setError('Invalid admin key.')
          return
        }
        const json = await res.json()
        if (!res.ok || !json.success) {
          setError(json.error || `Failed to load (${res.status})`)
          return
        }
        setRecord(json.record)
        setMatchedRepos(Array.isArray(json.matchedRepos) ? json.matchedRepos : [])
        setTalent(json.talent ?? null)
        setGithub(json.github ?? null)
        setDevfolio(json.devfolio ?? null)
        setEthglobal(Array.isArray(json.ethglobal) ? json.ethglobal : [])
        setPastDevcons(Array.isArray(json.pastDevcons) ? json.pastDevcons : [])
        setAutoDiscounts(Array.isArray(json.autoDiscounts) ? json.autoDiscounts : [])
        setExistingVoucher(json.existingVoucher ?? null)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [id]
  )

  useEffect(() => {
    if (secret && id) load(secret)
  }, [secret, id, load])

  function submitSecret(e: React.FormEvent) {
    e.preventDefault()
    const k = secretInput.trim()
    if (!k) return
    sessionStorage.setItem(ADMIN_KEY_STORAGE, k)
    setSecret(k)
  }

  async function decide(decision: Decision) {
    if (!id || !secret || !record) return
    const email = String(record['Email'] || '')
    if (decision === 'Approved' && !window.confirm(`Mint a builder voucher and EMAIL it to ${email}?`)) return
    if (decision === 'Rejected' && !window.confirm(`Mark this application as Rejected and EMAIL ${email}?`)) return
    setActioning(true)
    setActionResult(null)
    setError(null)
    try {
      const res = await fetch(`/api/builder/review/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': secret },
        body: JSON.stringify({ decision }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || 'Action failed')
        return
      }
      if (decision === 'Approved') {
        setActionResult(
          `Approved. ${json.reused ? 'Reused existing voucher' : 'Voucher'} ${json.code} ${
            json.emailed ? 'emailed to the applicant.' : '— email NOT sent, send it manually.'
          }`
        )
      } else {
        setActionResult(
          json.emailed
            ? 'Application rejected. The applicant has been emailed.'
            : 'Application rejected.'
        )
      }
      await load(secret)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setActioning(false)
    }
  }

  // ── Admin-key gate ──────────────────────────────────────────────
  if (!secret) {
    return (
      <Page darkHeader darkFooter>
        <Head>
          <title>Builder Review</title>
        </Head>
        <div className="min-h-[70vh] flex items-center justify-center bg-[#fbfafc] py-16">
          <form
            onSubmit={submitSecret}
            className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-8 max-w-[420px] w-full mx-4 flex flex-col gap-4"
          >
            <h1 className="text-2xl font-extrabold text-[#160b2b]">Builder Review</h1>
            <p className="text-sm text-[#594d73]">Enter the admin key to view this application.</p>
            <input
              type="password"
              value={secretInput}
              onChange={e => setSecretInput(e.target.value)}
              placeholder="Admin key"
              className="h-11 px-4 border border-[#dddae2] rounded-lg text-base"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              className="h-11 bg-[#7235ed] text-white font-bold rounded-full hover:bg-[#6029d1] transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
      </Page>
    )
  }

  const roles = String(record?.['Role'] || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  const otherRole = String(record?.['Other Role'] || '').trim()
  const decision = record?.['Decision'] as string | undefined
  const pill = decisionPill(decision)
  const ghUsername = String(record?.['GitHub Username'] || '').trim()
  const wallet = String(record?.['Wallet Address'] || '').trim()

  // Claimed repos (from the Contributed Repos field) that did NOT surface in any
  // matched group above — no need to repeat the ones already shown.
  const matchedRepoSet = new Set(matchedRepos.map(m => m.repo.toLowerCase()))
  const unlistedClaimed = String(record?.['Contributed Repos'] || '')
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(line => {
      const n = normRepo(line)
      return !(n && matchedRepoSet.has(n))
    })

  return (
    <Page darkHeader darkFooter>
      <Head>
        <title>{record ? `Review: ${record['Full Name'] || `#${id}`}` : 'Builder Review'}</title>
      </Head>
      <div className="min-h-[80vh] bg-[#fbfafc] py-12 px-4">
        <div className="max-w-[820px] mx-auto flex flex-col gap-6">
          {loading && (
            <div className="flex items-center gap-2 text-[#594d73]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {record && (
            <>
              {/* Header */}
              <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-extrabold text-[#160b2b]">{record['Full Name'] || `Application #${id}`}</h1>
                    <p className="text-sm text-[#594d73]">
                      {record['Country'] || '—'}
                      {record['Team'] ? ` · ${record['Team']}` : ''}
                      {record['Submission Date'] ? ` · ${new Date(record['Submission Date']).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full border text-sm font-bold ${pill.cls}`}>{pill.label}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] text-[#7235ed] border border-[#decffb] text-sm font-bold">
                    {record['Matched Count'] ?? 0} list match{(record['Matched Count'] ?? 0) === 1 ? '' : 'es'}
                  </span>
                </div>

                {roles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {roles.map(r => (
                      <span key={r} className="px-2.5 py-1 rounded-md bg-[#f1eff4] text-[#3b3450] text-sm">
                        {r}
                        {r === 'Other' && otherRole ? `: ${otherRole}` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {pastDevcons.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#a86510]">
                      <Award className="w-4 h-4" /> Past Devcon POAPs:
                    </span>
                    {pastDevcons.map(ev => (
                      <span
                        key={ev}
                        className="px-2.5 py-1 rounded-md bg-[#fff5e6] text-[#a86510] border border-[#f3d9ad] text-sm font-medium"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Links */}
              <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-6">
                <Section title="Identity & links">
                  <div className="flex flex-wrap gap-2">
                    <LinkChip
                      icon={<Github className="w-4 h-4" />}
                      label="GitHub"
                      value={ghUsername ? `@${ghUsername}` : ''}
                      href={ghUsername ? `https://github.com/${ghUsername}` : undefined}
                    />
                    <LinkChip icon={<Wallet className="w-4 h-4" />} label="Wallet" value={wallet} />
                    <LinkChip
                      icon={<Award className="w-4 h-4" />}
                      label="Talent"
                      value={record['Talent Protocol URL']}
                      href={record['Talent Protocol URL']}
                    />
                    <LinkChip
                      icon={<Award className="w-4 h-4" />}
                      label="POAP"
                      value={record['POAP URL']}
                      href={record['POAP URL']}
                    />
                    <LinkChip
                      icon={<Globe className="w-4 h-4" />}
                      label="Devfolio"
                      value={record['Devfolio URL']}
                      href={record['Devfolio URL']}
                    />
                    <LinkChip
                      icon={<Globe className="w-4 h-4" />}
                      label="Site"
                      value={record['Personal Website']}
                      href={record['Personal Website']}
                    />
                    <LinkChip
                      icon={<Globe className="w-4 h-4" />}
                      label="Social"
                      value={record['Social URL']}
                      href={record['Social URL']}
                    />
                  </div>
                </Section>
              </div>

              {/* Talent Protocol */}
              {talent && (
                <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-6">
                  <Section title="Talent Protocol">
                    <div className="flex items-start gap-4 flex-wrap">
                      {talent.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={talent.imageUrl}
                          alt=""
                          className="w-14 h-14 rounded-full object-cover border border-[#dddae2]"
                        />
                      )}
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-base font-bold text-[#160b2b]">{talent.displayName || '—'}</span>
                          {typeof talent.score === 'number' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] text-[#7235ed] border border-[#decffb] text-sm font-bold">
                              Builder Score {talent.score}
                              {typeof talent.rank === 'number' ? ` · #${talent.rank}` : ''}
                            </span>
                          )}
                          <a
                            href={talent.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-[#7235ed] underline"
                          >
                            View <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <p className="text-sm text-[#594d73]">
                          {[
                            talent.role,
                            talent.location && talent.location !== 'Unknown' ? talent.location : null,
                            talent.ens,
                            talent.onchainSince ? `onchain since ${new Date(talent.onchainSince).getFullYear()}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        {talent.bio && <p className="text-sm text-[#3b3450] leading-6 mt-1">{talent.bio}</p>}
                        {talent.socials.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {talent.socials.map(s => (
                              <span
                                key={s.source}
                                className="px-2.5 py-1 rounded-md bg-[#f1eff4] text-[#3b3450] text-xs"
                              >
                                {s.source === 'x_twitter' ? 'X' : s.source}: {s.username}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Section>
                </div>
              )}

              {/* Devfolio */}
              {devfolio && (
                <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-6">
                  <Section title="Devfolio (hackathons)">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-base font-bold text-[#160b2b]">{devfolio.name || `@${devfolio.username}`}</span>
                      {devfolio.githubVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e6f7ed] text-[#137a3e] border border-[#b7e6c9] text-[11px] font-bold">
                          <Check className="w-3 h-3" /> GitHub verified
                        </span>
                      ) : devfolio.github ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff5e6] text-[#a86510] border border-[#f3d9ad] text-[11px] font-bold">
                          GitHub @{devfolio.github} ≠ applicant
                        </span>
                      ) : null}
                      <a
                        href={devfolio.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#7235ed] underline"
                      >
                        View <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                      <StatTile label="Hackathons" value={devfolio.hackathonsAttended} />
                      <StatTile label="Projects built" value={devfolio.projectsBuilt} />
                      <StatTile label="Prizes won" value={devfolio.prizesWon} />
                      {devfolio.hackathonsOrganized > 0 && (
                        <StatTile label="Organized" value={devfolio.hackathonsOrganized} />
                      )}
                      {devfolio.onchainCreds > 0 && <StatTile label="Onchain creds" value={devfolio.onchainCreds} />}
                    </div>
                    {devfolio.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {devfolio.skills.map(s => (
                          <span key={s} className="px-2.5 py-1 rounded-md bg-[#f1eff4] text-[#3b3450] text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </Section>
                </div>
              )}

              {/* ETHGlobal hackathons (matched via GitHub repos) */}
              {ethglobal.length > 0 && (
                <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-6">
                  <Section title="ETHGlobal hackathons">
                    <p className="text-sm text-[#594d73]">
                      {ethglobal.length} project{ethglobal.length === 1 ? '' : 's'} matched via their GitHub
                      {ethglobal.some(e => e.finalist)
                        ? ` · ${ethglobal.filter(e => e.finalist).length} finalist`
                        : ''}
                    </p>
                    <div className="flex flex-col gap-2">
                      {ethglobal.map(p => (
                        <a
                          key={p.url}
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col gap-1 px-3 py-2 rounded-lg border border-[#dddae2] hover:bg-[#f9f8fa] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-[#160b2b] truncate">{p.title}</span>
                            {p.finalist && (
                              <span className="px-2 py-0.5 rounded-full border text-[11px] font-bold bg-[#fff8e6] text-[#9a6b00] border-[#f0dca8] shrink-0">
                                🏆 Finalist
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#594d73]">
                            {p.event} · {p.repo}
                          </span>
                          {p.prizes.length > 0 && (
                            <span className="text-[11px] text-[#0a7d63]">{p.prizes.join(' · ')}</span>
                          )}
                        </a>
                      ))}
                    </div>
                  </Section>
                </div>
              )}

              {/* GitHub activity */}
              {github && (
                <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-6">
                  <Section title="GitHub activity">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-base font-bold text-[#160b2b]">@{github.login}</span>
                      <a
                        href={`https://github.com/${github.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#7235ed] underline"
                      >
                        View <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                      <StatTile label="Followers" value={github.followers.toLocaleString()} />
                      <StatTile label="Public repos" value={github.publicRepos.toLocaleString()} />
                      {github.createdAt && (
                        <StatTile label="On GitHub since" value={new Date(github.createdAt).getFullYear()} />
                      )}
                      {github.prsMerged != null && <StatTile label="Merged PRs" value={github.prsMerged.toLocaleString()} />}
                      {github.prsAuthored != null && (
                        <StatTile label="PRs authored" value={github.prsAuthored.toLocaleString()} />
                      )}
                      {github.starsReceived != null && (
                        <StatTile label="Stars received" value={github.starsReceived.toLocaleString()} />
                      )}
                    </div>
                    {github.activity && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-[#594d73] mb-2">Last 2 years</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <StatTile label="Commits" value={github.activity.commits.toLocaleString()} />
                          <StatTile label="PRs" value={github.activity.prs.toLocaleString()} />
                          <StatTile label="Reviews" value={github.activity.reviews.toLocaleString()} />
                          <StatTile label="Repos contributed" value={github.activity.reposContributed.toLocaleString()} />
                        </div>
                      </div>
                    )}
                    {github.topLanguages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {github.topLanguages.map(l => (
                          <span key={l} className="px-2.5 py-1 rounded-md bg-[#f1eff4] text-[#3b3450] text-xs">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                    {github.achievements.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-[#594d73] mb-2">Achievements</p>
                        <div className="flex flex-wrap gap-2">
                          {github.achievements.map(a => (
                            <span
                              key={a}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fff8e6] text-[#9a6b00] border border-[#f0dca8] text-xs font-medium"
                            >
                              <Award className="w-3.5 h-3.5" /> {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Section>
                </div>
              )}

              {/* Contributions */}
              <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-6 flex flex-col gap-5">
                <Section title="Contributions">
                  {matchedRepos.length === 0 ? (
                    <p className="text-sm text-[#594d73]">No matched repos.</p>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {CONTRIB_GROUPS.map(group => {
                        const repos = matchedRepos.filter(group.match)
                        if (repos.length === 0) return null
                        return (
                          <div key={group.label} className="flex flex-col gap-2">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold shrink-0 ${group.cls}`}>
                                {group.label}
                              </span>
                              <span className="text-xs font-bold text-[#594d73]">{repos.length}</span>
                              <span className="text-xs text-[#594d73] leading-5">{group.desc}</span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {repos.map(r => (
                                <a
                                  key={r.repo}
                                  href={`https://github.com/${r.repo}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[#dddae2] hover:bg-[#f9f8fa] transition-colors"
                                >
                                  <span className="flex flex-col min-w-0 gap-0.5">
                                    <span className="text-sm font-medium text-[#160b2b] truncate">{r.repo}</span>
                                    {r.project && <span className="text-xs text-[#594d73] truncate">{r.project}</span>}
                                  </span>
                                  {typeof r.stars === 'number' && r.stars > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-xs text-[#594d73] shrink-0">
                                      <Star className="w-3 h-3" />
                                      {r.stars.toLocaleString()}
                                    </span>
                                  )}
                                </a>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {unlistedClaimed.length > 0 && (
                    <Essay label="Other claimed repos (not matched above)" text={unlistedClaimed.join('\n')} />
                  )}
                </Section>
              </div>

              {/* Essays */}
              <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-6 flex flex-col gap-4">
                <Section title="Application">
                  <Essay label="Why are you passionate about Ethereum?" text={record['Why Ethereum']} />
                  <Essay label="What do you hope to accomplish?" text={record['Goals']} />
                  <Essay label="Gender" text={record['Gender']} />
                </Section>
              </div>

              {/* Already-has-a-voucher warning — this person already holds a voucher
                  under one of their identities (wallet / GitHub / email), in any
                  program. Approving will REUSE this code, not mint a new one. */}
              {existingVoucher && (
                <div className="rounded-2xl border border-[#f3c2c2] bg-[#fdf2f2] p-5 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#b42124] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-sm font-bold text-[#b42124]">Already has a voucher</p>
                    <p className="text-sm text-[#7a2a2c] leading-5">
                      This person already holds voucher{' '}
                      <span className="font-mono font-bold">{existingVoucher.code}</span>
                      {existingVoucher.collection ? ` (${existingVoucher.collection})` : ''}, matched on{' '}
                      <span className="font-medium">{existingVoucher.assignedTo}</span>. Approving will reuse this
                      code rather than issue a second one.
                    </p>
                  </div>
                </div>
              )}

              {/* Already-qualifies warning — vouchers are one-per-identity, so issuing
                  a builder voucher to someone who can already self-claim a discount
                  would double-allocate. */}
              {autoDiscounts.length > 0 && (
                <div className="rounded-2xl border border-[#f3d9ad] bg-[#fffaf0] p-5 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#a86510] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2 min-w-0">
                    <p className="text-sm font-bold text-[#a86510]">Already qualifies for an automatic discount</p>
                    <div className="flex flex-wrap gap-2">
                      {autoDiscounts.map(d => (
                        <span
                          key={d.type}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff5e6] text-[#a86510] border border-[#f3d9ad] text-sm font-bold"
                        >
                          {d.name}: {d.discount >= 100 ? 'FREE' : `${d.discount}% off`}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-[#7a5a1a] leading-5">
                      They can self-claim this at the{' '}
                      <a
                        href="/en/tickets/store/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        ticket store
                      </a>
                      . Vouchers are one-per-identity, so issuing a builder voucher (50% off) on top would
                      double-allocate
                      {autoDiscounts.some(d => d.discount >= 50)
                        ? ' — and they already qualify for an equal or better discount.'
                        : '.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-6">
                <Section title="Admin">
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <p className="text-[#594d73]">
                      Email: <span className="text-[#160b2b] font-medium">{record['Email'] || '—'}</span>
                    </p>
                    <p className="text-[#594d73]">
                      Voucher sent: <span className="text-[#160b2b] font-medium">{record['Voucher Sent'] ? 'Yes' : 'No'}</span>
                    </p>
                    {record['Voucher Code'] && (
                      <p className="text-[#594d73] sm:col-span-2">
                        Voucher code: <span className="text-[#160b2b] font-mono font-medium">{record['Voucher Code']}</span>
                      </p>
                    )}
                    {record['Match Source'] && (
                      <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                        <span className="text-[#594d73]">Match summary:</span>
                        {parseMatchSummary(String(record['Match Source'])).map(({ label, count }) => (
                          <span
                            key={label}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${matchSummaryCls(
                              label
                            )}`}
                          >
                            {label}
                            <span className="opacity-70">{count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Section>
              </div>

              {/* Actions — sticky bottom bar; docks to a vertical panel on the
                  right once the viewport is wide enough to clear the content. */}
              <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[rgba(34,17,68,0.12)] bg-white p-4 shadow-lg min-[1400px]:fixed min-[1400px]:bottom-auto min-[1400px]:right-6 min-[1400px]:top-1/2 min-[1400px]:w-64 min-[1400px]:-translate-y-1/2 min-[1400px]:flex-col min-[1400px]:items-stretch min-[1400px]:justify-start">
                <div className="text-sm">
                  {actionResult ? (
                    <span className="text-[#137a3e] font-medium">{actionResult}</span>
                  ) : (
                    <span className="text-[#594d73]">Approve mints a builder voucher and emails the applicant.</span>
                  )}
                </div>
                <div className="flex items-center gap-3 min-[1400px]:flex-col min-[1400px]:items-stretch">
                  <button
                    type="button"
                    onClick={() => decide('Rejected')}
                    disabled={actioning}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-[#b42124] text-[#b42124] font-bold hover:bg-[#fdeaea] disabled:opacity-50 transition-colors min-[1400px]:w-full"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => decide('Approved')}
                    disabled={actioning}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#137a3e] text-white font-bold hover:bg-[#0f6532] disabled:opacity-50 transition-colors min-[1400px]:w-full"
                  >
                    {actioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Approve &amp; send voucher
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Page>
  )
}
