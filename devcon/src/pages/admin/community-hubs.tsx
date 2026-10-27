import React, { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { readStoredPassword, TICKETS_ADMIN_PASSWORD_KEY } from 'utils/adminPassword'

// Internal monitor for the Community Hubs pipeline: the hourly live export
// (GitHub Action, started by devcon-api) and what the API made of each hub's
// sheet. Everything here is public already (the API status endpoint and the
// repo's Actions runs), so the page is unlisted and noindex, not gated: hubs
// use it to see which of their rows the app could not read. Someone logged in on
// /tickets/admin with the full admin password also gets the pipeline view (export
// freshness, failed runs) and each hub's sheet (edit) link (/api/community-hubs/links).
// Pipeline details: docs/community-hubs.md in the monorepo.

const EVENT_ID = 'devcon8'
const STATUS_URL = `https://api.devcon.org/events/${EVENT_ID}/community-hubs`
const RUNS_URL =
  'https://api.github.com/repos/efdevcon/monorepo/actions/workflows/fileverse-live-export.yml/runs?per_page=30'
const RUNS_PAGE = 'https://github.com/efdevcon/monorepo/actions/workflows/fileverse-live-export.yml'
/**
 * The pause switch lives in the workflow file itself (EXPORT_PAUSED at its top, see
 * docs/community-hubs.md): while "true", runs skip the export, no sheet is read and the
 * API keeps serving the last export. Read from the raw file (public, open CORS, cached
 * five minutes by GitHub) so this page says so instead of showing a mysterious stale export.
 */
const WORKFLOW_RAW_URL =
  'https://raw.githubusercontent.com/efdevcon/monorepo/main/.github/workflows/fileverse-live-export.yml'
const WORKFLOW_PAGE = 'https://github.com/efdevcon/monorepo/blob/main/.github/workflows/fileverse-live-export.yml'
const PAUSE_SWITCH = /^\s*EXPORT_PAUSED:\s*"?(true|false)"?/m
/**
 * The export runs hourly but only rewrites the file when a sheet changed, or every
 * 6 h as a heartbeat (community-hubs-live.ts), so exportedAt is the last change.
 * Stale only past the heartbeat plus margin, the same 8 h the API warns at.
 */
const EXPORT_STALE_MS = 8 * 60 * 60_000
const REFRESH_MS = 5 * 60_000

interface HubStatus {
  id: string
  name: string
  sessions: number
  publishedAt: number | null
  readAt: number | null
  servedFrom: 'latest' | 'previous'
  problems: string[]
}

interface Status {
  version: string
  refreshedAt: number
  exportedAt: number | null
  problems: string[]
  hubs: HubStatus[]
}

interface Run {
  id: number
  event: string
  status: string
  conclusion: string | null
  created_at: string
  html_url: string
}

/** The API's own "export stopped" problem: expected, not alarming, while syncing is paused. */
const isStaleExportProblem = (problem: string) => /live export last ran/.test(problem)

function ago(ms: number | null | undefined, now: number): string {
  if (!ms) return 'never'
  const mins = Math.round((now - ms) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

const CARD = 'rounded-xl border border-[#e5e1ed] bg-white p-4'

function Tone({ tone, children }: { tone: 'ok' | 'warn' | 'bad'; children: React.ReactNode }) {
  const cls = {
    ok: 'bg-emerald-50 text-emerald-800',
    warn: 'bg-amber-50 text-amber-800',
    bad: 'bg-red-50 text-red-800',
  }[tone]
  const Icon = { ok: CheckCircle2, warn: AlertTriangle, bad: XCircle }[tone]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      <Icon className="size-3.5" />
      {children}
    </span>
  )
}

function hubTone(hub: HubStatus): 'ok' | 'warn' | 'bad' {
  // Red only when the hub shows nothing in the app; a sheet held back or with
  // bad rows still has its sessions live, so it's a fix-when-you-can.
  if (hub.sessions === 0) return 'bad'
  if (hub.servedFrom === 'previous' || hub.problems.length) return 'warn'
  return 'ok'
}

export default function CommunityHubsMonitor() {
  const [status, setStatus] = useState<Status | null>(null)
  const [runs, setRuns] = useState<Run[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [checkedAt, setCheckedAt] = useState<number | null>(null)
  const [links, setLinks] = useState<Record<string, string>>({})
  const [admin, setAdmin] = useState(false)
  // null until the workflow file has been read (or could not be).
  const [paused, setPaused] = useState<boolean | null>(null)

  // Once per visit: links don't change hour to hour, and no stored password means no request.
  useEffect(() => {
    const key = readStoredPassword(TICKETS_ADMIN_PASSWORD_KEY)
    if (!key) return
    fetch('/api/community-hubs/links/', { headers: { 'x-admin-key': key } })
      .then(res => (res.ok ? res.json() : null))
      .then(body => {
        if (!body?.links) return
        setLinks(body.links)
        setAdmin(true)
      })
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const errs: string[] = []
    // Export runs only for admins: they feed the pipeline view, and GitHub allows
    // 60 anonymous requests an hour per visitor.
    const [s, r, w] = await Promise.allSettled([
      fetch(STATUS_URL).then(res => (res.ok ? res.json() : Promise.reject(new Error(`API answered ${res.status}`)))),
      admin
        ? fetch(RUNS_URL).then(res =>
            res.ok ? res.json() : Promise.reject(new Error(`GitHub answered ${res.status}`))
          )
        : Promise.resolve(null),
      // For everyone: a hub whose edits stop landing should see why.
      fetch(WORKFLOW_RAW_URL).then(res =>
        res.ok ? res.text() : Promise.reject(new Error(`GitHub answered ${res.status}`))
      ),
    ])
    if (s.status === 'fulfilled') setStatus(s.value.data)
    else errs.push(`Hub status: ${s.reason instanceof Error ? s.reason.message : String(s.reason)}`)
    if (r.status === 'fulfilled') r.value && setRuns(r.value.workflow_runs)
    else errs.push(`Export runs: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`)
    if (w.status === 'fulfilled') setPaused(PAUSE_SWITCH.exec(w.value)?.[1] === 'true')
    else errs.push(`Sync switch: ${w.reason instanceof Error ? w.reason.message : String(w.reason)}`)
    setErrors(errs)
    setCheckedAt(Date.now())
    setLoading(false)
  }, [admin])

  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  const now = checkedAt ?? Date.now()
  const exportStale = status ? !status.exportedAt || now - status.exportedAt > EXPORT_STALE_MS : false
  const freshness: { tone: 'ok' | 'warn' | 'bad'; label: string } = paused
    ? { tone: 'warn', label: 'Sync paused' }
    : exportStale
    ? { tone: 'bad', label: 'Stale' }
    : { tone: 'ok', label: 'Fresh' }
  const dayRuns = (runs ?? []).filter(run => now - Date.parse(run.created_at) < 24 * 60 * 60_000)
  const failedRuns = dayRuns.filter(run => run.status === 'completed' && run.conclusion !== 'success')
  const lastRun = runs?.find(run => run.status === 'completed')
  const hubs = [...(status?.hubs ?? [])].sort((a, b) => {
    const rank = { bad: 0, warn: 1, ok: 2 }
    return rank[hubTone(a)] - rank[hubTone(b)] || a.name.localeCompare(b.name)
  })
  const hubsWithProblems = hubs.filter(hub => hubTone(hub) !== 'ok').length
  const totalSessions = hubs.reduce((n, hub) => n + hub.sessions, 0)

  return (
    <>
      <Head>
        <title>Community Hubs monitor</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="min-h-screen bg-[#f7f5fb] px-4 py-8 text-[#160b2b]">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Community Hubs monitor</h1>
              <p className="text-sm text-[#5b5370]">
                {admin
                  ? `Live sheet export and parse problems for ${EVENT_ID}.`
                  : 'Rows of each hub sheet the app could not read, and why.'}{' '}
                Checked {ago(checkedAt, Date.now())}, refreshes every 5 min.
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-[#e5e1ed] bg-white px-4 py-2 text-sm font-semibold hover:border-[#7235ed] disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Refresh
            </button>
          </header>

          {errors.length > 0 && (
            <div className={`${CARD} border-red-200 text-sm text-red-800`}>
              {errors.map(e => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}

          {paused && (
            <div className={`${CARD} border-amber-200 bg-amber-50 text-sm text-amber-900`}>
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4 shrink-0" />
                Live syncing is paused
              </p>
              <p className="mt-1">
                Sheet edits are not being picked up: the app keeps showing the programme as last exported
                {status?.exportedAt ? ` ${ago(status.exportedAt, now)}` : ''}. The Devcon team publishes Community Hubs
                updates manually for now, so an edit reaches the app with the next manual update.
                {admin && ' The problems below are those of that last export.'}
              </p>
              {admin && (
                <p className="mt-1">
                  Resume by setting EXPORT_PAUSED to false in the{' '}
                  <a
                    href={WORKFLOW_PAGE}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold hover:underline"
                  >
                    workflow file <ExternalLink className="size-3" />
                  </a>
                  . Runs keep starting every hour and skip the export while paused.
                </p>
              )}
            </div>
          )}

          {/* Last sheet change is public: it tells a hub whether its latest edit was picked up yet. */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className={CARD}>
              <p className="text-xs uppercase tracking-wide text-[#5b5370]">Last sheet change</p>
              <p className="mt-1 text-lg font-bold">{status ? ago(status.exportedAt, now) : '…'}</p>
              {status && <Tone tone={freshness.tone}>{freshness.label}</Tone>}
            </div>
            {admin && (
              <>
                <div className={CARD}>
                  <p className="text-xs uppercase tracking-wide text-[#5b5370]">Export runs, 24 h</p>
                  <p className="mt-1 text-lg font-bold">
                    {runs ? `${dayRuns.length - failedRuns.length}/${dayRuns.length} ok` : '…'}
                  </p>
                  {runs && (
                    <Tone tone={failedRuns.length ? 'warn' : 'ok'}>
                      {failedRuns.length ? `${failedRuns.length} failed` : 'No failures'}
                    </Tone>
                  )}
                </div>
                <div className={CARD}>
                  <p className="text-xs uppercase tracking-wide text-[#5b5370]">Hubs needing a look</p>
                  <p className="mt-1 text-lg font-bold">{status ? `${hubsWithProblems} of ${hubs.length}` : '…'}</p>
                  {status && (
                    <Tone tone={hubsWithProblems ? 'warn' : 'ok'}>{hubsWithProblems ? 'Problems' : 'All clean'}</Tone>
                  )}
                </div>
                <div className={CARD}>
                  <p className="text-xs uppercase tracking-wide text-[#5b5370]">Sessions served</p>
                  <p className="mt-1 text-lg font-bold">{status ? totalSessions : '…'}</p>
                  {lastRun && (
                    <a
                      href={lastRun.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#7235ed] hover:underline"
                    >
                      Last run {lastRun.conclusion} {ago(Date.parse(lastRun.created_at), now)}
                    </a>
                  )}
                </div>
              </>
            )}
          </section>

          {admin && (status?.problems.length || failedRuns.length > 0) && (
            <section className={CARD}>
              <h2 className="mb-2 text-lg font-bold">Pipeline problems</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {status?.problems.map(p =>
                  paused && isStaleExportProblem(p) ? (
                    <li key={p} className="flex gap-2 text-[#5b5370]">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      <span>{p}. Expected while syncing is paused.</span>
                    </li>
                  ) : (
                    <li key={p} className="flex gap-2">
                      <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
                      {p}
                    </li>
                  )
                )}
                {failedRuns.map(run => (
                  <li key={run.id} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <span>
                      Export run {run.conclusion} {ago(Date.parse(run.created_at), now)} ({run.event}).{' '}
                      <a
                        href={run.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#7235ed] hover:underline"
                      >
                        Log
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Hubs</h2>
            {!status && !errors.length && <p className="text-sm text-[#5b5370]">Loading…</p>}
            {hubs.map(hub => {
              const tone = hubTone(hub)
              return (
                <div key={hub.id} className={CARD}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{hub.name}</h3>
                      <Tone tone={tone}>
                        {hub.servedFrom === 'previous'
                          ? 'Serving previous sheet'
                          : hub.problems.length
                          ? `${hub.problems.length} problem${hub.problems.length > 1 ? 's' : ''}`
                          : hub.sessions === 0
                          ? 'No sessions'
                          : 'OK'}
                      </Tone>
                    </div>
                    <p className="flex items-center gap-3 text-xs text-[#5b5370]">
                      {hub.sessions} sessions · sheet changed {ago(hub.publishedAt, now)}
                      {links[hub.id] && (
                        <a
                          href={links[hub.id]}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#7235ed] hover:underline"
                        >
                          Sheet <ExternalLink className="size-3" />
                        </a>
                      )}
                    </p>
                  </div>
                  {hub.problems.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 border-t border-[#efecf4] pt-2 text-sm text-[#3d3452]">
                      {hub.problems.map((p, i) => (
                        <li key={i} className="break-words">
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </section>

          {admin && (
            <footer className="flex flex-wrap gap-4 text-xs text-[#5b5370]">
              <a
                href={RUNS_PAGE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                Export runs on GitHub <ExternalLink className="size-3" />
              </a>
              <a
                href={STATUS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                Raw API status <ExternalLink className="size-3" />
              </a>
            </footer>
          )}
        </div>
      </main>
    </>
  )
}
