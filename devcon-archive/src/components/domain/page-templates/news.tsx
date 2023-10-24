import React from 'react'
import { graphql } from 'gatsby'
import Content from 'src/components/common/layouts/content'
import { PageHero } from 'src/components/common/page-hero'
import { formatNewsData } from 'src/components/domain/news/formatNewsData'
import themes from './themes.module.scss'
import { pageHOC } from 'src/context/pageHOC'
import { PageContentSection } from './page-content-section'
import { NewsOverview } from 'src/components/domain/news/overview'

export default pageHOC(function NewsTemplate({ data }: any) {
  const newsItems = formatNewsData(data.newsData.nodes)

  return (
    <Content theme={themes['news']}>
      <PageHero />

      <PageContentSection>
        <NewsOverview newsItems={newsItems} />
      </PageContentSection>
    </Content>
  )
})

export const query = graphql`
  query ($slug: String!, $language: String!) {
    ...Page
    ...NavigationData
    ...Notification
    ...NewsData
  }
`
