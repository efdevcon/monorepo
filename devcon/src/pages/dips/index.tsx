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
import { Tags } from 'components/common/tags'
import { GetContributors, GetDIPs } from 'services/dips'
import HeroBackground from 'assets/images/pages/hero-bgs/dips-bg.jpg'

export default pageHOC(function DIPsTemplate(props: any) {
  const pageContext = usePageContext()
  const intl = useTranslations()

  return (
    <Page theme={themes['teal']}>
      <PageHero
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">Get Involved</span> }, { text: props.page.header }]}
        // cta={[
        //   {
        //     title: intl('dips_review_dips'),
        //     to: 'https://forum.devcon.org',
        //     icon: <BulletList />,
        //   },
        //   {
        //     title: intl('dips_create_proposal'),
        //     to: 'https://forum.devcon.org',
        //     icon: <Pencil />,
        //   },
        // ]}
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
            title: 'DIPS',
            to: '#proposals',
          },
        ]}
      />

      <div className="section">
        <Contribute dipDescription={props.page.body} contributors={props.contributors} />
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
  const contributors = await GetContributors()

  // console.log(dips, 'hello')

  return {
    props: {
      ...globalData,
      page,
      dips,
      contributors,
    },
    revalidate: 3600,
  }
}
