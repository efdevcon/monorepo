import React from 'react'
import { pageHOC } from 'context/pageHOC'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import Image from 'next/image'
import themes from './themes.module.scss'
import moment from 'moment'
import { getGlobalData } from 'services/global'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesDevcon_Week, PagesQuery } from '../../tina/__generated__/types'
import RichText from 'lib/components/tina-cms/RichText'
import EventSchedule from 'lib/components/event-schedule/EventSchedule'
import getNotionDatabase from 'components/domain/devcon-week/getNotionDatabase'
import { Client } from '@notionhq/client'
import { Snapshot } from 'components/common/snapshot'
import InfiniteScroller from 'lib/components/infinite-scroll'
import cn from 'classnames'
import IconClock from 'assets/icons/icon_clock.svg'
import indexCss from './index.module.scss'
import HeroBackground from 'assets/images/pages/hero-bgs/city-guide.png'
import css from './devcon-week.module.scss'
import { FAQ } from './faq'

const isAfterDate = (dateString: string) => {
  const date = moment.utc(dateString)
  const currentDate = moment.utc()

  return date.isBefore(currentDate)
}

export default pageHOC(function DevconWeek(props: any) {
  const { data } = useTina<PagesQuery>(props.content)
  const devconWeek = data.pages as PagesDevcon_Week

  return (
    <Page theme={themes['news']}>
      <PageHero
        title="Devcon Week"
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">Community</span> }, { text: 'Devcon Week' }]}
        navigation={[
          {
            title: 'Devcon Week',
            to: '#devcon-week',
          },
        ]}
      />

      <div className="section relative">
        <div className={cn('flex relative justify-between gap-16 border-bottom flex-col lg:flex-row pb-8')}>
          <div className={`${indexCss['scrolling-text-background']} ${css['devcon-week']}`}>
            <InfiniteScroller nDuplications={2} speed="120s" reverse>
              <p className="bold">DEVCON WEEK&nbsp;</p>
            </InfiniteScroller>
          </div>
          <div className="grow">
            {devconWeek && devconWeek.devcon_week && <RichText content={devconWeek.devcon_week.about} />}
          </div>
          <div className="flex-0 shrink-0 max-w-[100%] lg:max-w-[50%] w-[550px]">
            {/* {cityGuide.intro_snapshot?.title && <RichText content={''} />} */}

            <div className="text-lg h2 bold mb-6">Road to Devcon Hackathons</div>

            {devconWeek.snapshot && (
              <Snapshot
                // @ts-ignore
                items={devconWeek.snapshot.map(({ left, right }: any, index: number) => {
                  let icon

                  // TODO: Icon support in CMS
                  // if (index === 0) {
                  icon = IconClock
                  // }
                  // if (index === 1) {
                  //   icon = IconCurrency
                  // }
                  // if (index === 2) {
                  //   icon = IconGlobe
                  // }

                  // if (index === 3) {
                  //   icon = IconSun
                  // }

                  // if (index === 4) {
                  //   icon = IconWater
                  // }

                  return {
                    id: index,
                    Icon: icon,
                    left: <RichText content={left} />,
                    right: <RichText content={right} />,
                  }
                })}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <EventSchedule
          // @ts-ignore
          events={props.events}
          buttonColor="orange-1"
          edition="devcon-week"
          calendarOptions={{ id: 'devcon.org' }}
          sharingDisabled={true}
          renderBlockingEvent={() => {
            return (
              <div className="relative w-full h-full overflow-hidden min-h-[250px]">
                <Image
                  src={HeroBackground}
                  alt="Blocked Event Graphic"
                  className="absolute w-full h-full !object-center object-cover"
                />
              </div>
            )
          }}
        />
        {/* <div className="section relative">
          <div className={`${indexCss['scrolling-text-background']} ${css['devcon-week']}`}>
            <InfiniteScroller nDuplications={2} speed="120s" reverse>
              <p className="bold">DEVCON WEEK&nbsp;</p>
            </InfiniteScroller>
          </div>
        </div> */}
      </div>

      <div className="section relative">
        <div className="border-top mt-8 pt-8"></div>
        <FAQ title="Frequently Asked" anchor="#faq" faq={devconWeek.questions} />
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  // const globalData = await getGlobalData(context)
  // const page = await GetPage('/devcon-week', context.locale)
  // const faq = await GetFAQ(context.locale)
  // const sections = await GetContentSections(['post-devcon-events', 'local-tours'], context.locale)
  const globalData = await getGlobalData(context)
  const content = await client.queries.pages({ relativePath: 'devcon_week.mdx' })
  // const notion = new Client({
  //   auth: process.env.NOTION_SECRET,
  // })

  const events = await getNotionDatabase('en')

  // https://www.notion.so/ef-events/517164deb17b42c8a00a62e775ce24af?v=543a6aae6cc940c7b27b05c7b40e15e2 devcon week

  return {
    props: {
      ...globalData,
      page: {},
      events,
      content,
      // ...globalData,
      // sections,
      // faq: faq.filter((faq: any) => faq.category.id === 'devcon-week'),
      // scheduleData: await getNotionDatabase(context.locale || 'en'),
      // page,
    },
  }
}
