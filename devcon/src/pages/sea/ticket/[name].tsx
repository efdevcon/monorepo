import React from 'react'
import { GetPage } from 'services/page'
import { getGlobalData } from 'services/global'
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
  const globalData = await getGlobalData(context)
  const page = await GetPage('/404')

  return {
    props: {
      ...globalData,
      params: context.params,
      page,
    },
  }
}

export default Ticket
