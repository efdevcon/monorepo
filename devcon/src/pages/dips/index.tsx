import React from 'react'
import Page from 'components/common/layouts/page'
import themes from '../themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { PageHero } from 'components/common/page-hero'
import { usePageContext } from 'context/page-context'
import { useTranslations } from 'next-intl'
import { Contribute } from 'components/domain/dips/overview/contribute'
import { Proposals } from 'components/domain/dips/overview/proposals'
import { getGlobalData } from 'services/global'
import { GetPage } from 'services/page'
import { GetContributors, GetDIPs } from 'services/dips'
import HeroBackground from 'assets/images/pages/hero-bgs/get-involved.jpg'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../../tina/__generated__/client'
import { PagesDips, PagesQuery } from '../../../tina/__generated__/types'

export default pageHOC(function DIPsTemplate(props: any) {
  const pageContext = usePageContext()
  const intl = useTranslations()
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesDips

  return (
    <Page theme={themes['teal']}>
      <PageHero
        heroBackground={HeroBackground}
        title="DIPs & Community Hubs"
        path={[{ text: <span className="bold">Get Involved</span> }, { text: 'DIPs and Community Hubs' }]}
        navigation={[
          {
            title: intl('dips_forum').toUpperCase(),
            to: 'https://forum.devcon.org',
          },
          {
            title: 'GITHUB',
            to: 'https://github.com/efdevcon/DIPs',
          },
          {
            title: intl('dips_contribute').toUpperCase(),
            to: '#contribute',
          },
          {
            title: 'Community Hubs',
            to: '#hubs',
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

        {/* <Tags items={pageContext?.current?.tags} viewOnly /> */}
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/dips', context.locale)
  const dips = await GetDIPs()
  const dipsWithoutCommunityHub = dips.filter(dip => dip.tags.every(tag => tag !== ('Community Hub' as any)))
  const contributors = await GetContributors()
  const content = await client.queries.pages({ relativePath: 'dips.mdx' })

  return {
    props: {
      ...globalData,
      page,
      dips: dipsWithoutCommunityHub,
      contributors,
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
    revalidate: 3600,
  }
}
