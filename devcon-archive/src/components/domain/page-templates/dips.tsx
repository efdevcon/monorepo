import React from 'react'
import { graphql } from 'gatsby'
import Content from 'src/components/common/layouts/content'
import { DIP } from 'src/types/DIP'
import themes from './themes.module.scss'
import { pageHOC } from 'src/context/pageHOC'
import { PageHero } from 'src/components/common/page-hero'
import { usePageContext } from 'src/context/page-context'
import { useIntl } from 'gatsby-plugin-intl'
import Pencil from 'src/assets/icons/pencil.svg'
import BulletList from 'src/assets/icons/bullet_list.svg'
import { PageContentSection } from './page-content-section'
import { Contribute } from '../dips/overview/contribute'
import { Proposals } from '../dips/overview/proposals'

export default pageHOC(function DIPsTemplate({ data }: any) {
  const intl = useIntl()
  const pageContext = usePageContext()

  return (
    <Content theme={themes['teal']}>
      <PageHero
        cta={[
          {
            title: intl.formatMessage({ id: 'dips_review_dips' }),
            to: 'https://forum.devcon.org',
            icon: <BulletList />,
          },
          {
            title: intl.formatMessage({ id: 'dips_create_proposal' }),
            to: 'https://forum.devcon.org',
            icon: <Pencil />,
          },
        ]}
        navigation={[
          {
            title: intl.formatMessage({ id: 'dips_forum' }).toUpperCase(),
            to: 'https://forum.devcon.org',
          },
          {
            title: 'GITHUB',
            to: 'https://github.com/efdevcon/DIPs',
          },
          {
            title: intl.formatMessage({ id: 'dips_contribute' }).toUpperCase(),
            to: '#contribute',
          },
          {
            title: 'DIPS',
            to: '#proposals',
          },
        ]}
      />

      <PageContentSection>
        <Contribute dipDescription={pageContext?.current?.body} contributors={data.contributors.nodes} />
        <Proposals dips={React.useMemo(() => data.dips.nodes.map((dip: DIP) => mapToDIP(dip)), [data.dips])} />
      </PageContentSection>
    </Content>
  )
})

export function mapToDIP(source: any): DIP {
  return {
    github: source.frontmatter.Github_URL,
    // summary: source.frontmatter.Summary,
    summary: source.excerpt,
    number: source.frontmatter.DIP,
    title: source.frontmatter.Title,
    status: source.frontmatter.Status,
    themes: source.frontmatter.Themes ? source.frontmatter.Themes.split(',') : [],
    tags: source.frontmatter.Tags ? source.frontmatter.Tags.split(',') : [],
    authors: source.frontmatter.Authors ? source.frontmatter.Authors.split(',') : [],
    resources: source.frontmatter.Resources,
    discussion: source.frontmatter.Discussion,
    created: new Date(source.frontmatter.Created),
    next_dip: source.frontmatter.next_dip,
    prev_dip: source.frontmatter.prev_dip,
    // body: source.html,
    slug: source.fields?.slug,
  }
}

export const query = graphql`
  query ($slug: String!, $language: String!) {
    ...Page
    ...DipsData
    ...Notification
    ...NavigationData
  }
`
