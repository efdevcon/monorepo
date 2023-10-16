import React from 'react'
import Image404 from 'assets/images/404.png'
import themes from './themes.module.scss'
import { PageHero } from 'components/common/page-hero'
import Image from "next/legacy/image"
import { pageHOC } from 'context/pageHOC'
import { GetPage } from 'services/page'
import { getGlobalData } from 'services/global'
import Page from 'components/common/layouts/page'

const Offline = () => {
  return (
    <Page theme={themes['no-page']}>
      <PageHero path={[{ text: <span className="bold">NETWORK OFFLINE</span> }]} title="Network Offline" />

      <div className="section clear-top clear-bottom">
        <p>You are currently offline and this page was not cached. Try again later.</p>
      </div>
    </Page>
  )
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

export default Offline
