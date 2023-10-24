import React from 'react'
import { graphql } from 'gatsby'
import Content from 'src/components/common/layouts/content'
import { pageHOC } from 'src/context/pageHOC'
import themes from './themes.module.scss'
import { PageContentSection } from './page-content-section'
import { PageHero } from 'src/components/common/page-hero'
import { Link } from 'src/components/common/link'

export default pageHOC(function TagTemplate({ data }: any) {
  const results = data.results

  return (
    <Content theme={themes['light-blue']}>
      <PageHero />

      <PageContentSection>
        <h2>Tag Results</h2>
        <ul>
          {results &&
            results.nodes?.length > 0 &&
            results.nodes.map((i: any) => {
              return (
                <li>
                  <Link key={i.fields.slug} to={i.fields.slug}>
                    {i.frontmatter.title}
                  </Link>
                </li>
              )
            })}
        </ul>
      </PageContentSection>
    </Content>
  )
})

export const query = graphql`
  query ($slug: String!, $language: String!, $tag: String!) {
    results: allMarkdownRemark(filter: { frontmatter: { tags: { in: [$tag] } }, fields: { lang: { eq: $language } } }) {
      nodes {
        frontmatter {
          title
          description
          template
          tags
        }
        fields {
          lang
          id
          collection
          slug
        }
      }
    }
    ...Page
    ...NavigationData
    ...Notification
  }
`
