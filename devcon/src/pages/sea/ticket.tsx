import React from 'react'
import { GetPage } from 'services/page'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import { Hero } from 'components/domain/index/hero'

const Ticket = (props: any) => {
  return <Hero ticketMode></Hero>
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
