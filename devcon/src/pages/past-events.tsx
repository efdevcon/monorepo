import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import { pageHOC } from 'context/pageHOC'
import { getGlobalData } from 'services/global'
import { GetDevconEditions, GetPage } from 'services/page'
import { Tags } from 'components/common/tags'
import { usePageContext } from 'context/page-context'
import ArrowRight from 'assets/icons/arrow_right.svg'
import css from './past-events.module.scss'
import { Link } from 'components/common/link'
import Image from 'next/image'
import EventLocations from 'assets/images/event-locations.png'
import { Button } from 'lib/components/button'
import { useTranslations } from 'next-intl'
import HeroBackground from 'assets/images/pages/hero-bgs/about.jpg'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../tina/__generated__/client'
import { PagesPast_Events, PagesQuery } from '../../tina/__generated__/types'
import InfiniteScroller from 'lib/components/infinite-scroll'
import RichText from 'lib/components/tina-cms/RichText'
import indexCss from './index.module.scss'

export default pageHOC(function PastEvents(props: any) {
  const intl = useTranslations()
  const pageContext = usePageContext()
  const { data } = useTina<PagesQuery>(props.cms)
  const pages = data.pages as PagesPast_Events
  const events = pages.events || []

  return (
    <Page theme={themes['about']}>
      <PageHero
        heroBackground={HeroBackground}
        path={[{ text: <span className="bold">{intl('navigation_about')}</span> }, { text: props.page.header }]}
        navigation={events.map((event: any) => {
          return {
            title: event.title,
            to: `#${event.title}`,
          }
        })}
      />

      <div className="section">
        <div className={`two-columns ${css['about']} clear-bottom border-bottom margin-bottom relative`}>
          <div className={`left ${css['left']}`}>
            <RichText content={pages.section1?.about} />
          </div>
          <div className={`right ${css['right']}`}>
            <h2 className="spaced">{intl('past_events_locations')}</h2>
            <Image src={EventLocations} alt="Devcon events on world map" />
          </div>

          <div className={`${indexCss['scrolling-text-background']}`}>
            <InfiniteScroller nDuplications={2} speed="120s">
              <p className="bold">PAST DEVCONS&nbsp;</p>
            </InfiniteScroller>
          </div>
        </div>

        <div className="border-bottom clear-bottom">
          <h2>{intl('past_events_past_devcons')}</h2>
        </div>

        {events.map((event, index: number) => {
          if (!event) return

          const isLast = index === events.length - 1

          let className = 'clear-bottom clear-top'

          if (!isLast) className += ` border-bottom`

          return (
            <div key={event.title} id={event.title} className={className}>
              <div className={css['edition']}>
                <div className={css['left']}>
                  <div className="relative w-full">
                    <Image
                      src={event.image || ''}
                      alt={`${event.title} event image`}
                      className="!w-full !h-auto !relative"
                      fill
                    />
                  </div>
                </div>
                <div className={css['right']}>
                  <h2 className="my-4">{event.title}</h2>
                  <RichText content={event.description} />
                  <Link className="mt-5" key={event.button_link} to={event.button_link}>
                    <Button color="green-1" fat fill onClick={(e: React.SyntheticEvent) => e.stopPropagation()}>
                      {event.button}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )
        })}

        <div className="clear-bottom" />

        <Tags items={pageContext?.current?.tags} viewOnly />
      </div>
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const page = await GetPage('/past-events', context.locale)

  const content = await client.queries.pages({ relativePath: 'past_events.mdx' })

  return {
    props: {
      ...globalData,
      page,
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
  }
}
