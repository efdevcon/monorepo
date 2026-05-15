import React from 'react'
import Head from 'next/head'
import { TicketSharing } from 'components/domain/ticket-sharing'
import type { GetServerSidePropsContext } from 'next'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

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
        {/* Warm the OG image cache from the user's browser so by the time Twitter
            scrapes the URL (typically several seconds after the user posts), the
            JPEG is already in our Supabase cache and the scrape is a fast HIT. */}
        <link rel="preload" as="image" href={props.imageUrl} />
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

async function resolveEnsAvatar(name: string, timeoutMs: number): Promise<string | null> {
  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(process.env.NEXT_PUBLIC_INFURA_APIKEY ? `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_APIKEY}` : undefined),
    })
    const avatar = await Promise.race([
      client.getEnsAvatar({ name: normalize(name) }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
    ])
    return avatar || null
  } catch {
    return null
  }
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // Catch-all route accepts /ticket/{name} or /ticket/{name}/{cacheBuster}.
  // The cacheBuster is purely a URL-uniqueness device for social card scrapers
  // (Twitter/Warpcast cache by full URL). It doesn't affect the rendered page.
  const slug = (context.params?.slug as string[] | undefined) || []
  const name = (slug[0] || 'Anon').replace(/\+/g, ' ')
  const cacheBuster = slug[1] || ''
  const share = context.query.share !== undefined
  const proto = context.req.headers['x-forwarded-proto'] || 'https'
  const host = context.req.headers.host || 'devcon.org'
  const baseUrl = `${proto}://${host}`

  const encodedName = encodeNameForPath(name)
  const avatarUrl = isEnsName(name) ? await resolveEnsAvatar(name, 2500) : null

  const busterSegment = cacheBuster ? `/${encodeURIComponent(cacheBuster)}` : ''
  // og:image ends in .jpg — Next.js exempts file extensions from trailingSlash redirects, so no slash.
  const imageUrl = `${baseUrl}/api/ticket/${encodedName}${busterSegment}.jpg`
  // Page URL: trailing slash matches next.config.js `trailingSlash: true`, so the og:url
  // we emit is the canonical URL Twitter sees post-redirect — no inconsistency that could
  // cause Twitter to dedupe across the slashed/unslashed variants.
  const pageUrl = `${baseUrl}/ticket/${encodedName}${busterSegment}/`
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
