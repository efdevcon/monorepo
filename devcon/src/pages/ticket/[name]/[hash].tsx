import React from 'react'
import Head from 'next/head'
import { TicketSharing } from 'components/domain/ticket-sharing'
import type { GetServerSidePropsContext } from 'next'

const BUCKET = 'og-tickets'

const Ticket = (props: {
  params: { name: string }
  imageUrl: string
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
        <meta name="image" key="image" content={props.imageUrl} />
        <meta property="og:type" key="og:type" content="website" />
        <meta property="og:url" key="og:url" content={props.pageUrl} />
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

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const name = (context.params?.name as string) || 'Anon'
  const hash = context.params?.hash as string
  const share = context.query.share !== undefined
  const proto = context.req.headers['x-forwarded-proto'] || 'https'
  const host = context.req.headers.host || 'devcon.org'
  const baseUrl = `${proto}://${host}`

  // OG image — pass hash to edge function for avatar resolution
  const imageUrl = `${baseUrl}/api/ticket/${encodeURIComponent(name)}/?h=${encodeURIComponent(hash)}`
  const pageUrl = `${baseUrl}/ticket/${encodeURIComponent(name)}/${encodeURIComponent(hash)}/`

  // Check if avatar exists in Supabase for client-side display
  let avatarUrl: string | null = null
  const supabaseUrl = process.env.SUPABASE_URL
  if (supabaseUrl) {
    try {
      const avatarCheck = await fetch(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${hash}_avatar.png`, {
        method: 'HEAD',
      })
      if (avatarCheck.ok) {
        avatarUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${hash}_avatar.png`
      }
    } catch {
      // No avatar
    }
  }

  return {
    props: {
      params: { name },
      imageUrl,
      pageUrl,
      xUsername: '',
      share,
      hash,
      avatarUrl,
    },
  }
}

export default Ticket
