import React from 'react'

import { Ticket } from 'lib/components/ticket'
import { ShareTicket } from './index'

const TicketPage = (props: any) => {
  if (!props.params) return null

  return <ShareTicket name={props.params.name} />
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

export default TicketPage
