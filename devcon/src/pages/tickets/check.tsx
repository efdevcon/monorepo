import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Page from 'components/common/layouts/page'
import { OtpGate } from 'components/domain/nocodb-form/OtpGate'
import { supabase } from 'services/supabase-browser'

/**
 * Proof of concept: sign in with an email code, then see whether that address
 * received a Devcon 8 memory email for a checked-in ticket, matched on the
 * keyed email hash only (api/memory/email-check). Not linked anywhere.
 */

type CheckResult = { email: string; tickets: number; claimed: number; minted: number }

function TicketCheck() {
  const [result, setResult] = useState<CheckResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const session = supabase ? (await supabase.auth.getSession()).data.session : null
        if (!session?.access_token) throw new Error('Sign in again.')
        const res = await fetch('/api/memory/email-check/', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Check failed')
        setResult(json.data)
      } catch (err) {
        setError((err as Error).message)
      }
    })()
  }, [])

  if (error) return <p className="text-sm text-[#b42124] text-center">{error}</p>
  if (!result) return <p className="text-sm text-[#594d73] text-center">Checking...</p>

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  return (
    <div className="flex flex-col gap-3 w-full px-4 py-4 bg-[#f3f0ff] border border-[#decffb] rounded-lg text-sm leading-5 text-[#1a0d33]">
      {result.tickets > 0 ? (
        <>
          <p className="font-bold text-[#160b2b]">
            Yes: {plural(result.tickets, 'checked-in Devcon 8 ticket')} for this email.
          </p>
          <p>
            Memory links opened: {result.claimed} of {result.tickets}. Memories minted: {result.minted} of{' '}
            {result.tickets}.
          </p>
        </>
      ) : (
        <p className="font-bold text-[#160b2b]">No checked-in Devcon 8 ticket was emailed to this address.</p>
      )}
      <p className="text-xs text-[#594d73]">
        Matched on a keyed hash of your email, the one each memory code was stored with: no email address is kept with
        the codes. The address is the ticket&apos;s attendee email (or the order email when the ticket had none).
      </p>
    </div>
  )
}

export default function TicketCheckPage() {
  return (
    <Page darkHeader darkFooter>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-t from-[#e5ebff] from-[20%] to-[#fbfafc] py-16">
        <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl p-8 max-w-[640px] w-full mx-4 flex flex-col items-center gap-6">
          <OtpGate
            title="Devcon 8 ticket check"
            description="Proof of concept: sign in with your email to see whether it had a checked-in Devcon 8 ticket."
          >
            {() => <TicketCheck />}
          </OtpGate>
        </div>
      </div>
    </Page>
  )
}
