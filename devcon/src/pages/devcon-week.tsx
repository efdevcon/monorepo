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
import { Snapshot } from 'components/common/snapshot'
import InfiniteScroller from 'lib/components/infinite-scroll'
import cn from 'classnames'
import IconClock from 'assets/icons/icon_clock.svg'
import indexCss from './index.module.scss'
import HeroBackground from 'assets/images/pages/hero-bgs/city-guide.png'
import LogoFlowers from 'assets/images/dc-7/logo-flowers.png'
import DateText from 'assets/images/dc-7/date-text.png'
import DC7Left from 'components/domain/index/hero/images/dc-7/left.png'
import DC7Right from 'components/domain/index/hero/images/dc-7/right.png'
import css from './devcon-week.module.scss'
import { FAQ } from './faq'
import { Link } from 'components/common/link'
import { Button } from 'lib/components/button'

const isAfterDate = (dateString: string) => {
  const date = moment.utc(dateString)
  const currentDate = moment.utc()

  return date.isBefore(currentDate)
}

export default pageHOC(function DevconWeek(props: any) {
  const { data } = useTina<PagesQuery>(props.content)
  const devconWeek = data.pages as PagesDevcon_Week

  // Fill in empty days with empty events (will be rendered with no opacity)
  const eventsFullRange = (() => {
    const events = props.events

    // Helper function to create a new event for a given date
    const createEvent = (date: any) => ({
      Category: [],
      Date: { startDate: date, endDate: date },
      URL: '',
      Length: ['1 Day'],
      Language: null,
      Difficulty: null,
      Organizer: [],
      Description: '',
      Location: '',
      Live: false,
      'Stable ID': '',
      'Block Schedule': false,
      'Priority (0=high,10=low)': null,
      Name: 'Empty Event',
      Empty: true,
      'Time of Day': 'FULL DAY',
      ID: date.startDate, // Generate a unique ID if needed
      ShortID: '', // Generate a short ID if needed
    })

    // Convert dates in the events array to a Set for easy lookup
    const existingEventDates = new Set(events.map((event: any) => event.Date.startDate))

    // Create an array to hold the full range of events
    const fullRangeEvents = [...events]

    // Define the date range using Moment.js
    const startDate = moment('2024-11-10')
    const endDate = moment('2024-11-17')

    // Iterate over each day in the range
    for (let d = startDate; d.isSameOrBefore(endDate); d.add(1, 'days')) {
      const formattedDate = d.format('YYYY-MM-DD')

      // If there's no event for this date, add a default event
      if (!existingEventDates.has(formattedDate)) {
        fullRangeEvents.push(createEvent(formattedDate))
      }
    }

    fullRangeEvents.sort((a, b) => moment(a.Date.startDate).diff(moment(b.Date.startDate)))

    // Return the full range of events
    return fullRangeEvents
  })()

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
          {
            title: 'Schedule',
            to: '#schedule',
          },
          // {
          //   title: 'FAQ',
          //   to: '#faq',
          // },
        ]}
      />

      <div className="section relative" id="devcon-week">
        <div className={cn('flex relative justify-between gap-16 border-bottom flex-col lg:flex-row pb-8')}>
          <div className={`${indexCss['scrolling-text-background']} ${css['devcon-week']}`}>
            <InfiniteScroller nDuplications={2} speed="120s" reverse>
              <p className="bold">DEVCON WEEK&nbsp;</p>
            </InfiniteScroller>
          </div>
          <div className="grow">
            {devconWeek && devconWeek.devcon_week && <RichText content={devconWeek.devcon_week.about} />}
          </div>
          <div className="flex flex-col flex-0 shrink-0 max-w-[100%] lg:max-w-[50%] w-[550px]">
            {/* {cityGuide.intro_snapshot?.title && <RichText content={''} />} */}

            <div className="text-lg h2 bold mb-6">Upcoming Road to Devcon Events</div>

            {devconWeek.snapshot && (
              <Snapshot
                items={props.roadToDevconEvents.map((event: any) => {
                  const start = moment(event.Date.endDate)
                  const end = moment(event.Date.endDate)
                  const icon = IconClock

                  let date = `${start.format('MMM D')}`
                  if (!start.isSame(end, 'day')) {
                    date = `${start.format('MMM D')} - ${end.format('MMM D')}`
                  }

                  return {
                    id: event.Name,
                    Icon: icon,
                    left: event.Link ? (
                      <Link to={event.Link} indicateExternal className="bold ">
                        {event.Name}
                      </Link>
                    ) : (
                      <div className="bold">{event.Name}</div>
                    ),
                    right: date,
                  }
                })}
              />
            )}
            <Link to="/road-to-devcon" className="self-end">
              <Button color="orange-1" className="mt-4 self-end">
                See All Road to Devcon Events
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6" id="schedule">
        <EventSchedule
          // @ts-ignore
          events={eventsFullRange}
          buttonColor="orange-1"
          edition="devcon-week"
          calendarOptions={{ id: 'devcon.org' }}
          sharingDisabled={true}
          renderBlockingEvent={() => {
            return (
              <div className="relative w-full h-full overflow-hidden min-h-[300px] bg-[#f8f9ff] border-solid border-t-4 border-2 border-[#9667bc] shadow-lg">
                {/* <Image
                  src={EventBlocker}
                  alt="Blocked Event Graphic"
                  className="absolute w-full h-full !object-center object-cover"
                /> */}

                <Image
                  src={DC7Left}
                  alt="Blocked Event Graphic"
                  className="absolute left-0 h-full !object-left object-contain"
                />

                <Image
                  src={DC7Right}
                  alt="Blocked Event Graphic"
                  className="absolute right-0 h-full !object-right object-contain"
                />

                <div className="absolute w-full h-full flex flex-col gap-4 items-center justify-center align-center">
                  <Image
                    src={LogoFlowers}
                    alt="Blocked Event Graphic"
                    className="!object-center object-contain w-[30%] max-h-[125px]"
                  />
                  <Image
                    src={DateText}
                    alt="Blocked Event Graphic"
                    className="!object-center object-contain w-[20%] max-h-[50px]"
                  />

                  <Link to="/">
                    <Button color="purple-1" fill className="semi-bold shadow-xl">
                      Devcon Main Event →
                    </Button>
                  </Link>
                </div>
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

      {/* <div className="section relative">
        <div className="border-top mt-8 pt-8"></div>
        <FAQ title="Frequently Asked" anchor="#faq" faq={devconWeek.questions} />
      </div> */}
    </Page>
  )
})

export async function getStaticProps(context: any) {
  const globalData = await getGlobalData(context)
  const content = await client.queries.pages({ relativePath: 'devcon_week.mdx' })

  const RTDNotionID = '5199f81539da498f9e2137c3928f6e93'
  const events = await getNotionDatabase('en', '1c8de49be9594869a2e72406fde2af68')

  const RTDEvents = (await getNotionDatabase('en', RTDNotionID)) as any

  const formattedEvents = RTDEvents.filter((event: any) => {
    const end = moment(event.Date.endDate).add(1, 'days')
    const now = moment()

    return now.isBefore(end)
  })
    .sort((a: any, b: any) => {
      return moment(a.Date.startDate).diff(moment(b.Date.startDate))
    })
    .map((event: any, index: number) => {
      const end = moment(event.Date.endDate).add(1, 'days')
      const now = moment()

      const eventHasPassed = now.isAfter(end)

      return {
        ...event,
        _key: event.Name + event.Location,
        eventHasPassed,
      }
    })
    .slice(0, 5)

  // https://www.notion.so/ef-events/517164deb17b42c8a00a62e775ce24af?v=543a6aae6cc940c7b27b05c7b40e15e2 devcon week

  return {
    props: {
      ...globalData,
      page: {},
      events,
      roadToDevconEvents: formattedEvents,
      content,
    },
    revalidate: 3600,
  }
}
