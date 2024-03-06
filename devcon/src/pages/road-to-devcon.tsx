import React from 'react'
import { pageHOC } from 'context/pageHOC'
import { GetBlogs } from 'services/blogs'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { getGlobalData } from 'services/global'
import getNews from 'services/news'
import css from './index.module.scss'
import { GetContentSections, GetTracks } from 'services/page'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesQuery, PagesIndex } from '../../tina/__generated__/types'
import themes from './themes.module.scss'
import { Header } from 'components/common/layouts/header'
import { Footer } from 'components/common/layouts/footer'
import { PageHero } from 'components/common/page-hero'
import Page from 'components/common/layouts/page'

export default pageHOC(function RoadToDevcon(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesIndex

  return (
    <Page>
      <PageHero
        path={[{ text: 'Get Involved' }, { text: 'Road To Devcon' }]}
        navigation={[
          {
            title: 'Journey',
            to: '#journey',
          },
          {
            title: 'Events',
            to: '#events',
          },
          {
            title: 'Grants',
            to: '#grants',
          },
          {
            title: 'Communities',
            to: '#communities',
          },
        ]}
      />

      <div className="section">
        <p>Hello world</p>
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const content = await client.queries.pages({ relativePath: 'road_to_devcon.mdx' })

  return {
    props: {
      ...globalData,
      page: DEFAULT_APP_PAGE,
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
    revalidate: 1 * 60 * 30,
  }
}
