import React from 'react'
import { GetPage } from 'services/page'
import { getGlobalData } from 'services/global'
import { Hero } from 'components/domain/index/hero'

const Ticket = () => {
  return <Hero name='Anon' ticketMode></Hero>
}

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/404')

  return {
    props: {
      ...globalData,
      page,
    },
  }
}

export default Ticket
