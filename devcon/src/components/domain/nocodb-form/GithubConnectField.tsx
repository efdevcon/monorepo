import React, { useEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Github } from 'lucide-react'
import { getSession, signOut } from 'next-auth/react'
import { useBuilderConnect, checkAutoDiscount } from 'context/BuilderConnectContext'
import { rhfFieldName } from './rhf-key'

interface Props {
  columnName: string
  label: string
  required?: boolean
  description?: string
  // When true, render only the button/connected state (no label/description) —
  // used inside the combined "Connections" block, which owns the heading.
  hideHeader?: boolean
}

// Reuses the app's existing NextAuth GitHub OAuth: opens the shared `/signin`
// popup (which calls signIn('github')) and polls getSession() — the same
// standalone pattern as VerifyDiscountModal (no SessionProvider needed). The
// verified login IS the GitHub session; submit.ts re-reads it server-side via
// getServerSession, so no client-held proof token is required.
// Column that holds the manually-claimed repos; we prefill it (when empty) with
// the connected user's list-matched repos.
const CONTRIBUTED_REPOS_COLUMN = 'Contributed Repos'

export function GithubConnectField({ columnName, label, required, description, hideHeader }: Props) {
  const { setValue, watch, getValues } = useFormContext()
  const { reportDiscount } = useBuilderConnect()
  const fieldKey = rhfFieldName(columnName)
  const username = watch(fieldKey) as string | undefined
  const [authing, setAuthing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Prefill the Contributed Repos field with recognized repos — but only when the
  // applicant hasn't already typed something, so we never clobber their edits.
  async function prefillContributedRepos() {
    try {
      const res = await fetch('/api/builder/repos/')
      const json = await res.json()
      if (!json?.success || !Array.isArray(json.repos) || json.repos.length === 0) return
      const reposKey = rhfFieldName(CONTRIBUTED_REPOS_COLUMN)
      const existing = ((getValues(reposKey) as string | undefined) ?? '').trim()
      if (!existing) setValue(reposKey, json.repos.join('\n'), { shouldValidate: true })
    } catch {
      // best-effort prefill — ignore failures
    }
  }

  // Restore an existing GitHub session on mount (e.g. already signed in).
  useEffect(() => {
    let active = true
    getSession()
      .then(s => {
        const sess = s as { id?: string; type?: string } | null
        if (active && sess?.type === 'github' && sess.id) {
          setValue(fieldKey, sess.id, { shouldValidate: true })
          prefillContributedRepos()
          checkAutoDiscount(sess.id).then(reportDiscount)
        }
      })
      .catch(() => {})
    return () => {
      active = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey, setValue])

  function connect() {
    if (authing) return
    setAuthing(true)
    const w = 500
    const h = 650
    const left = Math.max(0, (window.screen.width - w) / 2)
    const top = Math.max(0, (window.screen.height - h) / 2)
    const popup = window.open('/signin', 'github-signin', `width=${w},height=${h},left=${left},top=${top}`)
    popup?.focus()

    const start = Date.now()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      let session: { id?: string; type?: string } | null = null
      try {
        session = await getSession()
      } catch {
        session = null
      }
      const closed = !popup || popup.closed
      if (session?.type === 'github' && session.id) {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
        setAuthing(false)
        popup?.close()
        setValue(fieldKey, session.id, { shouldValidate: true })
        prefillContributedRepos()
        checkAutoDiscount(session.id).then(reportDiscount)
      } else if (closed || Date.now() - start > 120_000) {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
        setAuthing(false)
      }
    }, 1000)
  }

  async function disconnect() {
    try {
      await signOut({ redirect: false })
    } catch {
      // ignore — clearing the field below is what matters for the form
    }
    setValue(fieldKey, '', { shouldValidate: true })
  }

  const connected = Boolean(username)

  return (
    <div className="flex flex-col gap-3">
      {!hideHeader && (
        <div className="flex flex-col gap-2">
          <label className="text-base font-bold text-[#160b2b] leading-6">
            {label}
            {required && <span className="text-[#b42124] ml-0.5">*</span>}
          </label>
          {description ? <p className="text-sm text-[#594d73] leading-5">{description}</p> : null}
        </div>
      )}

      {connected ? (
        <div className="flex items-center gap-2 w-full px-4 py-2.5 bg-[#f9f8fa] border border-[#dddae2] rounded-lg text-sm">
          <span className="text-[#594d73] shrink-0">Verified as:</span>
          <Github className="w-4 h-4 text-[#160b2b] shrink-0" aria-hidden="true" />
          <span className="font-medium text-[#160b2b] truncate">{username}</span>
          <button
            type="button"
            onClick={disconnect}
            className="ml-auto shrink-0 font-medium text-[#7235ed] underline hover:opacity-80 transition-opacity"
          >
            Sign out
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={connect}
          disabled={authing}
          className="inline-flex w-fit items-center gap-2 px-5 py-2.5 bg-[#160b2b] text-white text-sm font-semibold rounded-full hover:bg-[#2d1a55] transition-colors disabled:opacity-50"
        >
          <Github className="w-4 h-4 shrink-0" aria-hidden="true" />
          {authing ? 'Connecting…' : 'Sign in with GitHub'}
        </button>
      )}
    </div>
  )
}
