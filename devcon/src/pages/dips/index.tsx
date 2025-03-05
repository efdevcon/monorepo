import React from 'react'
import Page from 'components/common/layouts/page'
import themes from '../themes.module.scss'
import { PageHero } from 'components/common/page-hero'
import { Contribute } from 'components/domain/dips/overview/contribute'
import { Proposals } from 'components/domain/dips/overview/proposals'
import { GetContributors, GetDIPs } from 'services/dips'
import HeroBackground from 'assets/images/pages/hero-bgs/get-involved.jpg'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../../tina/__generated__/client'
import { PagesDips, PagesQuery } from '../../../tina/__generated__/types'

export default function DIPsTemplate(props: any) {
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesDips

  return (
    <Page theme={themes['teal']}>
      <PageHero
        heroBackground={HeroBackground}
        title="DIPs"
        path={[{ text: <span className="bold">Get Involved</span> }, { text: 'DIPs' }]}
        navigation={[
          {
            title: 'Forum',
            to: 'https://forum.devcon.org',
          },
          {
            title: 'GITHUB',
            to: 'https://github.com/efdevcon/DIPs',
          },
          {
            title: 'Contribute',
            to: '#contribute',
          },
          {
            title: 'Accepted Proposals',
            to: '#proposals',
          },
        ]}
      />

      <div className="section">
        <Contribute
          dipDescription={pages.section1?.about}
          communityHubs={pages.community_hubs}
          contributors={props.contributors}
        />
        <Proposals dips={props.dips} />
      </div>
    </Page>
  )
}

export async function getStaticProps(context: any) {
  const dips = await GetDIPs()
  const dipsWithoutCommunityHub = dips.filter(dip => dip.tags.every(tag => tag !== ('Community Hub' as any)))
  const contributors = await GetContributors()
  const content = await client.queries.pages({ relativePath: 'dips.mdx' })

  return {
    props: {
      dips: dipsWithoutCommunityHub,
      contributors,
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
    revalidate: 43200, // 12 hours
  }
}
