import React from 'react'
import Head from 'next/head'
import { TicketSharing } from 'components/domain/ticket-sharing'
import type { GetServerSidePropsContext } from 'next'

const BUCKET = 'og-tickets'

const Ticket = (props: {
  params: { name: string }
  imageUrl: string
  stableImageUrl: string
  ogUrl: string
  xUsername: string
  pageUrl: string
  share: boolean
  hash: string
  avatarUrl: string | null
}) => {
  if (!props.params) return null

  const title = `${props.params.name} — Devcon`
  const description = 'Attending Devcon: the schelling point for the Ethereum community'

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" key="description" content={description} />
        <meta name="image" key="image" content={props.stableImageUrl} />
        <meta property="og:type" key="og:type" content="website" />
        <meta property="og:url" key="og:url" content={props.ogUrl} />
        <meta property="og:title" key="og:title" content={title} />
        <meta property="og:description" key="og:description" content={description} />
        <meta property="og:image" key="og:image" content={props.stableImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta name="twitter:card" key="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" key="twitter:title" content={title} />
        <meta name="twitter:description" key="twitter:description" content={description} />
        <meta name="twitter:image" key="twitter:image" content={props.stableImageUrl} />
        <meta name="twitter:image:alt" key="twitter:image:alt" content={`${props.params.name} - Devcon India Ticket`} />
        <meta name="theme-color" key="theme-color" content="#1a0a3e" />
      </Head>
      <TicketSharing
        name={props.params.name}
        imageUrl={props.imageUrl}
        xUsername={props.xUsername}
        share={props.share}
        pageUrl={props.pageUrl}
        hash={props.hash}
        avatarUrl={props.avatarUrl}
      />
    </>
  )
}

// Encode name for URL path — use + for spaces so social crawlers (Farcaster) don't truncate at %20
function encodeNameForPath(name: string): string {
  return encodeURIComponent(name).replace(/%20/g, '+')
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // Next.js auto-decodes params; also convert + back to space for URLs built with encodeNameForPath
  const name = ((context.params?.name as string) || 'Anon').replace(/\+/g, ' ')
  const slug = context.params?.slug as string[]
  const hash = slug[0]
  const cacheBuster = slug[1] || ''
  const share = context.query.share !== undefined
  const proto = context.req.headers['x-forwarded-proto'] || 'https'
  const host = context.req.headers.host || 'devcon.org'
  const baseUrl = `${proto}://${host}`

  const encodedName = encodeNameForPath(name)

  // Cache buster is in the path so every share is a unique URL for Twitter/Warpcast
  // ogUrl matches the full path; pageUrl is the base for share buttons to append fresh cache busters
  const imageUrl = cacheBuster
    ? `${baseUrl}/api/ticket/${encodedName}/${encodeURIComponent(hash)}/${cacheBuster}.jpg`
    : `${baseUrl}/api/ticket/${encodedName}/${encodeURIComponent(hash)}/i.jpg`
  const ogUrl = cacheBuster
    ? `${baseUrl}/ticket/${encodedName}/${encodeURIComponent(hash)}/${cacheBuster}`
    : `${baseUrl}/ticket/${encodedName}/${encodeURIComponent(hash)}/`
  const pageUrl = `${baseUrl}/ticket/${encodedName}/${encodeURIComponent(hash)}/`

  // Check if avatar exists in Supabase for client-side display
  // and derive a deterministic image version for social crawlers.
  let avatarUrl: string | null = null
  let imageVersion = typeof context.query.v === 'string' && context.query.v ? context.query.v : '0'
  const supabaseUrl = process.env.SUPABASE_URL
  if (supabaseUrl && imageVersion === '0') {
    try {
      const avatarCheck = await fetch(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${hash}_avatar.png`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(1500),
      })
      if (avatarCheck.ok) {
        avatarUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${hash}_avatar.png`
        const lastModified = avatarCheck.headers.get('last-modified')
        const avatarUpdatedAt = lastModified ? new Date(lastModified).getTime() : NaN
        if (Number.isFinite(avatarUpdatedAt) && avatarUpdatedAt > 0) {
          imageVersion = Math.floor(avatarUpdatedAt / 1000).toString()
        }
      }
    } catch {
      // No avatar
    }
  }

  // Stable per-ticket URL for cache hits, versioned by avatar freshness for crawler invalidation.
  const stableImageUrl = `${baseUrl}/api/ticket/${encodedName}/${encodeURIComponent(hash)}/i.jpg?v=${imageVersion}`

  return {
    props: {
      params: { name },
      imageUrl,
      stableImageUrl,
      ogUrl,
      pageUrl,
      xUsername: '',
      share,
      hash,
      avatarUrl,
    },
  }
}

export default Ticket
