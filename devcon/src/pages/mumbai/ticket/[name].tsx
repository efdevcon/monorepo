import React from 'react'
import { Hero } from 'components/domain/index/hero'
import { SITE_URL } from 'utils/constants'

const Ticket = (props: any) => {
  if (!props.params) return null

  const name = props.params.name || 'Anon'
  const imageUrl = `${SITE_URL}api/mumbai/ticket/${encodeURIComponent(name)}`

  return <Hero name={name} ticketMode imageUrl={imageUrl}></Hero>
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(context: any) {
  return {
    props: {
      params: context.params,
    },
  }
}

export default Ticket
