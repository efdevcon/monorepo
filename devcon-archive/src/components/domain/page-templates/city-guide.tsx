import React from 'react'
import { graphql } from 'gatsby'
import { PageHero } from 'src/components/common/page-hero'
import { FAQ } from 'src/components/domain/faq'
import { ToFaqData } from 'src/components/domain/faq/queryMapper'
import Content from 'src/components/common/layouts/content'
import css from './templates.module.scss'
import themes from './themes.module.scss'
import { Carousel } from 'src/components/common/carousel'
import { Snapshot } from 'src/components/common/snapshot'
import { TwoColumns } from 'src/components/common/sections/2column'
import { useIntl } from 'gatsby-plugin-intl'
import { pageHOC } from 'src/context/pageHOC'
import { PageContentSection } from './page-content-section'
import { usePageContext } from 'src/context/page-context'

export default pageHOC(function CityGuideTemplate({ data }: any) {
  const intl = useIntl()
  const pageContext = usePageContext()
  const faqs = ToFaqData(data)
  const faq = faqs.filter(i => i.id === 'location')
  const todo = {
    title: data.todo.nodes[0].frontmatter.title,
    showTitle: data.todo.nodes[0].frontmatter.showTitle,
    left: data.todo.nodes[0].fields.frontmattermd.left.html,
    right: data.todo.nodes[0].fields.frontmattermd.right.html,
  }
  const why = {
    title: data.why.nodes[0].frontmatter.title,
    showTitle: data.why.nodes[0].frontmatter.showTitle,
    left: data.why.nodes[0].fields.frontmattermd.left.html,
    right: data.why.nodes[0].fields.frontmattermd.right.html,
  }

  return (
    <Content theme={themes['purple']}>
      <PageHero
        navigation={[
          {
            title: intl.formatMessage({ id: 'location_title' }),
            to: '#location',
          },
          {
            title: intl.formatMessage({ id: 'location_things_todo' }),
            to: '#things-todo',
          },
          {
            title: intl.formatMessage({ id: 'location_why_bogota' }),
            to: '#why-bogota',
          },
          {
            title: 'Frequently Asked Questions',
            to: '#FAQ',
          },
        ]}
      />

      <PageContentSection>
        <TwoColumns
          id="about"
          title={intl.formatMessage({ id: 'location_title' })}
          left={pageContext?.current?.body}
          right={<Snapshot />}
        />

        <section id="carousel" className={css['section']}>
          <Carousel />
        </section>

        <TwoColumns id="things-todo" left={todo.left} right={todo.right} />

        <TwoColumns id="why-bogota" title={why.title} left={why.left} right={why.right} />

        <section id="FAQ" className={css['section']}>
          <FAQ data={faq} customCategoryTitle="Frequently Asked Questions" />
        </section>
      </PageContentSection>
    </Content>
  )
})

export const query = graphql`
  query ($slug: String!, $language: String!) {
    ...Page
    ...NavigationData
    ...Notification
    ...Categories
    ...FAQs
    todo: allMarkdownRemark(
      filter: {
        fields: { lang: { eq: $language }, collection: { eq: "sections" }, id: { eq: "things-to-do" } }
        frontmatter: { title: { ne: "" } }
      }
    ) {
      nodes {
        frontmatter {
          title
        }
        fields {
          id
          frontmattermd {
            left {
              html
            }
            right {
              html
            }
          }
        }
      }
    }
    why: allMarkdownRemark(
      filter: {
        fields: { lang: { eq: $language }, collection: { eq: "sections" }, id: { eq: "why-devcon-in-bogota" } }
        frontmatter: { title: { ne: "" } }
      }
    ) {
      nodes {
        frontmatter {
          title
        }
        fields {
          id
          frontmattermd {
            left {
              html
            }
            right {
              html
            }
          }
        }
      }
    }
  }
`
