import React from 'react'
import Head from 'next/head'
import { TicketSharing } from 'components/domain/ticket-sharing'
import type { GetServerSidePropsContext } from 'next'

interface TicketProps {
  name: string
  avatarUrl: string | null
  imageUrl: string
  pageUrl: string
  ogUrl: string
  share: boolean
}

const Ticket = (props: TicketProps) => {
  const title = `${props.name} — Devcon`
  const description = 'Attending Devcon: the schelling point for the Ethereum community'

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" key="description" content={description} />
        <meta name="image" key="image" content={props.imageUrl} />
        <meta property="og:type" key="og:type" content="website" />
        <meta property="og:url" key="og:url" content={props.ogUrl} />
        <meta property="og:title" key="og:title" content={title} />
        <meta property="og:description" key="og:description" content={description} />
        <meta property="og:image" key="og:image" content={props.imageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta name="twitter:card" key="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" key="twitter:title" content={title} />
        <meta name="twitter:description" key="twitter:description" content={description} />
        <meta name="twitter:image" key="twitter:image" content={props.imageUrl} />
        <meta name="twitter:image:alt" key="twitter:image:alt" content={`${props.name} - Devcon India Ticket`} />
        <meta name="theme-color" key="theme-color" content="#1a0a3e" />
      </Head>
      <TicketSharing name={props.name} avatarUrl={props.avatarUrl} share={props.share} pageUrl={props.pageUrl} />
    </>
  )
}

// Encode name for URL path — use + for spaces so social crawlers (Farcaster) don't truncate at %20
function encodeNameForPath(name: string): string {
  return encodeURIComponent(name).replace(/%20/g, '+')
}

function isEnsName(name: string): boolean {
  return /\.eth$/i.test(name.trim())
}

// Resolves an ENS avatar URL with tier-1 (ensdata.net) → tier-2
// (metadata.ens.domains) fallback. ensdata.net returns a pre-sized avatar URL
// served from their CDN, usually faster than the canonical gateway. We return
// a URL the browser will fetch directly; the client `<img>` has an onError
// fallback so any late-stage failure degrades gracefully to no-avatar layout.
async function resolveEnsAvatar(name: string, timeoutMs: number): Promise<string | null> {
  const normalizedName = name.trim().toLowerCase()
  const encodedName = encodeURIComponent(normalizedName)
  const perAttemptMs = Math.max(1500, Math.floor(timeoutMs / 3))

  // Tier 1: ensdata.net — pre-sized avatar from their CDN, usually fastest
  try {
    const res = await fetch(`https://ensdata.net/${encodedName}`, { signal: AbortSignal.timeout(perAttemptMs) })
    if (res.ok) {
      const data = (await res.json()) as { avatar_small?: string; avatar?: string }
      const url = data.avatar_small || data.avatar
      if (url) return url
    }
  } catch {
    // transient — fall through to tier 2
  }

  // Tier 2: ENS metadata gateway — canonical source. HEAD is cheap; we only
  // need to verify the URL is reachable so the browser can safely embed it.
  const fallbackUrl = `https://metadata.ens.domains/mainnet/avatar/${encodedName}`
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(fallbackUrl, { method: 'HEAD', signal: AbortSignal.timeout(perAttemptMs) })
      if (res.ok) return fallbackUrl
      if (res.status === 404) break
    } catch {
      // transient — retry
    }
  }

  return null
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const name = ((context.params?.name as string) || 'Anon').replace(/\+/g, ' ')
  const share = context.query.share !== undefined
  const proto = context.req.headers['x-forwarded-proto'] || 'https'
  const host = context.req.headers.host || 'devcon.org'
  const baseUrl = `${proto}://${host}`

  const encodedName = encodeNameForPath(name)
  const avatarUrl = isEnsName(name) ? await resolveEnsAvatar(name, 5000) : null

  const imageUrl = `${baseUrl}/api/ticket/${encodedName}.jpg`
  const pageUrl = `${baseUrl}/ticket/${encodedName}`
  const ogUrl = pageUrl

  return {
    props: {
      name,
      avatarUrl,
      imageUrl,
      pageUrl,
      ogUrl,
      share,
    },
  }
}

export default Ticket
