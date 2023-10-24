import React from 'react'
import { graphql } from 'gatsby'
import { SEO } from 'src/components/domain/seo'
import Content from 'src/components/common/layouts/content'
import { PageHero } from 'src/components/common/page-hero'
import { formatNewsData } from 'src/components/domain/news/formatNewsData'
import { NewsPage } from 'src/components/domain/news/page/NewsPage'
import themes from './themes.module.scss'
import { pageHOC } from 'src/context/pageHOC'

export default pageHOC(function NewsTemplate({ data, location }: any) {
  const page = data.markdownRemark
  const newsItem = formatNewsData(data.newsData.nodes)[0]

  return (
    <Content theme={themes['orange']}>
      <SEO title={page.frontmatter.title} lang={page.fields.lang} />

      <PageHero title={page.frontmatter.title} background={newsItem.imageUrl} />

      <NewsPage data={newsItem} />
    </Content>
  )
})

export const query = graphql`
  query ($slug: String!, $language: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      frontmatter {
        title
      }
      fields {
        lang
      }
      html
    }
    ...NavigationData
    ...Notification
    ...NewsItemData
  }
`
