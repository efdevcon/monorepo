import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import { GetPage } from 'services/page'
import { usePageContext } from 'context/page-context'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesSupporters, PagesQuery } from '../../tina/__generated__/types'
import HeroBackground from 'assets/images/pages/hero-bgs/get-involved.jpg'
import RichText from 'lib/components/tina-cms/RichText'
import CallToAction from 'components/common/card/CallToActionCard'
import InfiniteScroller from 'lib/components/infinite-scroll'
import SpeakersBackground from 'assets/images/pages/program.svg'
import cn from 'classnames'
import indexCss from './index.module.scss'
import css from './supporters.module.scss'

export default pageHOC(function Supporters(props: any) {
  // const pageContext = usePageContext()
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesSupporters

  return (
    <Page theme={themes['teal']}>
      <PageHero
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">Get Involved</span> }, { text: 'Supporters & Impact Teams' }]}
        navigation={[
          {
            title: 'Supporters',
            to: '#supporters',
          },
          {
            title: 'Impact Teams',
            to: '#impact',
          },
          // {
          //   title: 'Supporters',
          //   to: '#supporters',
          // },
        ]}
      />

      <div className="section" id="supporters">
        <div className={cn('flex justify-between gap-8 flex-col lg:flex-row')}>
          <div className="grow">{pages?.supporters && <RichText content={pages.supporters} />}</div>
          <div className="flex-0 shrink-0 max-w-[100%] lg:max-w-[50%] w-[750px]">
            <CallToAction
              color="teal"
              title={'Become a Supporter'}
              tag="Deadline - 31 July"
              BackgroundSvg={SpeakersBackground}
              link={pages.supporters_card?.button?.link}
              linkText={pages.supporters_card?.button?.text}
              // buttonDisabled
              meta=""
            >
              {pages?.supporters_card?.card && <RichText content={pages.supporters_card.card} />}
            </CallToAction>
          </div>
        </div>
      </div>

      <div className="section" id="impact">
        <div className="flex border-top mt-8 pt-8 pb-16 relative">
          <div className="grow">{pages?.impact_forum && <RichText content={pages.impact_forum} />}</div>
          <div className={`${indexCss['scrolling-text-background']} ${css['scroller']}`}>
            <InfiniteScroller nDuplications={2} speed="120s">
              <p className="bold">IMPACT FORUM&nbsp;</p>
            </InfiniteScroller>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="flex border-top pt-8 mb-12">
          <div className="grow">{pages?.programming_tickets && <RichText content={pages.programming_tickets} />}</div>
        </div>
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  // await GetPage('terms-of-service', context.locale)

  const content = await client.queries.pages({ relativePath: 'supporters.mdx' })

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
