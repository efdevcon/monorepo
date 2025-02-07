import React from 'react'

import { Hero } from 'components/domain/index/hero'

const Ticket = (props: any) => {
  if (!props.params) return null

  return <Hero name={props?.params?.name} ticketMode></Hero>
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
