import React from 'react'
import Head from 'next/head'
import { TicketSharing } from 'components/domain/ticket-sharing'
import type { GetServerSidePropsContext } from 'next'

const Ticket = (props: { params: { name: string }; imageUrl: string; stableImageUrl: string; ogUrl: string; xUsername: string; pageUrl: string; share: boolean }) => {
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
      <TicketSharing name={props.params.name} imageUrl={props.imageUrl} xUsername={props.xUsername} share={props.share} pageUrl={props.pageUrl} />
    </>
  )
}

// Encode name for URL path — use + for spaces so social crawlers (Farcaster) don't truncate at %20
function encodeNameForPath(name: string): string {
  return encodeURIComponent(name).replace(/%20/g, '+')
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const name = ((context.params?.name as string) || 'Anon').replace(/\+/g, ' ')
  const xUsername = typeof context.query.x === 'string' ? context.query.x : ''
  const share = context.query.share !== undefined
  const proto = context.req.headers['x-forwarded-proto'] || 'https'
  const host = context.req.headers.host || 'devcon.org'
  const baseUrl = `${proto}://${host}`

  const encodedName = encodeNameForPath(name)

  let imageUrl = `${baseUrl}/api/ticket/${encodedName}/i.jpg`
  if (xUsername) imageUrl += `?x=${encodeURIComponent(xUsername)}`

  // Stable URL for meta tags (already stable in this legacy route)
  const stableImageUrl = imageUrl

  let pageUrl = `${baseUrl}/ticket/${encodedName}`
  if (xUsername) pageUrl += `?x=${encodeURIComponent(xUsername)}`

  // Legacy route — no path-based cache busting, same URL for og:url
  const ogUrl = pageUrl

  return {
    props: {
      params: { name },
      imageUrl,
      stableImageUrl,
      ogUrl,
      pageUrl,
      xUsername,
      share,
    },
  }
}

export default Ticket
