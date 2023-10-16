import React from 'react'
import Image404 from 'assets/images/404.png'
import themes from './themes.module.scss'
import { PageHero } from 'components/common/page-hero'
import Image from "next/legacy/image"
import css from './404.module.scss'
import { GetPage } from 'services/page'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import Page from 'components/common/layouts/page'

const FourOhFour = pageHOC(() => {
  return (
    <Page theme={themes['no-page']}>
      <PageHero
        path={[
          { text: <span className="bold">4</span> },
          { text: <span className="bold">0</span> },
          { text: <span className="bold">4</span> },
        ]}
      />

      <div className="section clear-top clear-bottom">
        <div className={css['container']}>
          <div className={css['center']}>
            <Image src={Image404} alt="Man looking for something" />
          </div>
        </div>
      </div>
    </Page>
  )
})

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

export default FourOhFour
