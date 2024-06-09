import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import { GetPage } from 'services/page'
import { usePageContext } from 'context/page-context'
import HeroBackground from 'assets/images/pages/hero-bgs/news.jpg'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'

import { PagesTickets, PagesQuery } from '../../tina/__generated__/types'
import RichText from 'lib/components/tina-cms/RichText'

export default pageHOC(function Tickets(props: any) {
  const pageContext = usePageContext()
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesTickets

  return (
    <Page theme={themes['news']}>
      <PageHero
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">Tickets</span> }, { text: props.page.header }]}
        navigation={[
          {
            title: 'Blablabla',
            to: '#intro',
          },
        ]}
      />

      <div className="section" id="intro">
        Hello Tickets
        {pages?.placeholder_one?.body && <RichText content={pages.placeholder_one.body} />}
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  // await GetPage('terms-of-service', context.locale)

  const content = await client.queries.pages({ relativePath: 'tickets.mdx' })

  return {
    props: {
      ...globalData,
      page: {},
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
  }
}
