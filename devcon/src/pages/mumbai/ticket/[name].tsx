import React from 'react'
import { Hero } from 'components/domain/index/hero'
import { SITE_URL } from 'utils/constants'

const Ticket = (props: { params: { name: string }; imageUrl: string }) => {
  if (!props.params) return null

  return <Hero name={props.params.name} ticketMode imageUrl={props.imageUrl}></Hero>
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(context: any) {
  const name = context.params.name || 'Anon'
  const baseUrl = 'https://dev--devcon-monorepo.netlify.app'
  const imageUrl = `${baseUrl.replace(/\/$/, '')}/api/mumbai/ticket/${encodeURIComponent(name)}`

  return {
    props: {
      params: context.params,
      imageUrl,
    },
  }
}

export default Ticket
