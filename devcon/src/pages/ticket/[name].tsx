import React from 'react'
import Head from 'next/head'
import { TicketSharing } from 'components/domain/ticket-sharing'
import type { GetServerSidePropsContext } from 'next'

const Ticket = (props: { params: { name: string }; imageUrl: string; xUsername: string; pageUrl: string; share: boolean }) => {
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
      <TicketSharing name={props.params.name} imageUrl={props.imageUrl} xUsername={props.xUsername} share={props.share} pageUrl={props.pageUrl} />
    </>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const name = (context.params?.name as string) || 'Anon'
  const xUsername = typeof context.query.x === 'string' ? context.query.x : ''
  const share = context.query.share !== undefined
  const proto = context.req.headers['x-forwarded-proto'] || 'https'
  const host = context.req.headers.host || 'devcon.org'
  const baseUrl = `${proto}://${host}`

  let imageUrl = `${baseUrl}/api/ticket/${encodeURIComponent(name)}/`
  if (xUsername) {
    imageUrl += `?x=${encodeURIComponent(xUsername)}`
  }

  let pageUrl = `${baseUrl}/ticket/${encodeURIComponent(name)}`
  if (xUsername) {
    pageUrl += `?x=${encodeURIComponent(xUsername)}`
  }

  return {
    props: {
      params: { name },
      imageUrl,
      pageUrl,
      xUsername,
      share,
    },
  }
}

export default Ticket
