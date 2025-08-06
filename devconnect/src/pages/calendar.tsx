import React from 'react'
import { useCalendarStore } from 'store/calendar'
import { Client } from '@notionhq/client'
import { Footer, Header, withTranslations } from 'pages/index'
import { client } from '../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import Image from 'next/image'
import styles from './calendar.module.scss'
import cn from 'classnames'
import NewSchedule from 'lib/components/event-schedule-new'
import { formatResult } from 'lib/helpers/notion-normalizer'
import moment from 'moment'
import PageTitle from 'assets/images/ba/subpage_event_calendar_2x.webp'
import Voxel from 'assets/images/ba/voxel-0.jpg'
import RichText from 'lib/components/tina-cms/RichText'
import { CMSButtons } from 'common/components/voxel-button/button'

const Argentina = (props: any) => {
  const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } = useCalendarStore()
  const { data }: { data: any } = useTina(props.content)

  const coreEvents = [
    {
      id: 'event-000',
      priority: 1,
      spanRows: 2,
      name: `Ethereum World's Fair & Coworking Space`,
      description: 'Open coworking space for developers, builders, and researchers to collaborate throughout the week.',
      organizer: 'Ethereum Foundation',
      difficulty: 'all welcome',
      isCoreEvent: true,
      timeblocks: [
        {
          start: '2025-11-17T09:00:00Z',
          end: '2025-11-22T18:00:00Z',
        },
        {
          start: '2025-11-20T09:00:00Z',
          end: '2025-11-20T18:00:00Z',
        },
        {
          start: '2025-11-22T09:00:00Z',
          end: '2025-11-22T18:00:00Z',
        },
      ],
      location: {
        url: 'https://example.com/coworking',
        text: 'Innovation Hub',
      },
    },
    {
      id: 'event-001',
      priority: 2,
      spanRows: 3,
      name: 'ETH Day',
      description: 'A beginner-friendly workshop covering blockchain fundamentals and use cases.',
      organizer: 'EF team',
      difficulty: 'all welcome',
      isFairEvent: true,
      timeblocks: [
        {
          start: '2025-11-17T10:00:00Z',
          end: '2025-11-17T12:00:00Z',
        },
      ],
      location: {
        url: 'https://example.com/venue1',
        text: 'Main Conference Hall',
      },
      // timeblocks: [
      //   {
      //     start: '2025-11-17T10:00:00Z',
      //     end: '2025-11-17T12:00:00Z',
      //   },
      // ],
      // priority: 1,
      // categories: ['Education', 'Blockchain', 'Workshop'],
    },
  ]

  const events = props.events.map((event: any) => {
    const overrides = {} as any

    if (event.id === '1f5638cd-c415-809b-8fbd-ec8c4ba7f5b9') {
      overrides.name = 'ETH Day'
      overrides.isFairEvent = true
      overrides.spanRows = 3
    }

    return {
      ...event,
      ...overrides,
      onClick: () => {},
    }
  })

  return (
    <>
      <Header active fadeOutOnScroll />
      <div className={cn('relative h-[28vh] w-full text-black bg-black flex flex-col justify-end overflow-hidden')}>
        <Image
          src={Voxel}
          alt="Voxel art background"
          className={cn(styles.argentina, 'object-cover absolute object-[0%,14%] h-full w-full opacity-80')}
        />

        <div className="section z-10 pb-1">
          <div className="flex justify-between items-end">
            <Image src={PageTitle} alt="Page Title" className={'contain w-[450px] translate-x-[-3%]'} />
            {/* <div className={cn(styles.shadow, 'gap-2 pb-3 text-white hidden md:block')}>Buenos Aires, ARGENTINA</div> */}
          </div>
        </div>

        <div className={styles['devconnect-overlay']}></div>
        {/* <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50"></div> */}
      </div>
      <div className="flex flex-col text-black">
        <div className="section">
          <div className="flex justify-between gap-4 my-6">
            <div className="text-3xl hidden md:block font-secondary">
              <b>Argentina 2025</b> — Schedule
            </div>
            <div className="text-sm rounded-md bg-[#74ACDF33] px-4 py-2 text-[#36364C]">
              <RichText content={data.pages.calendar_disclaimer} />
            </div>
          </div>
        </div>

        <div className="section overflow-visible touch-only:contents">
          <NewSchedule
            events={events}
            selectedEvent={selectedEvent}
            selectedDay={selectedDay}
            setSelectedEvent={setSelectedEvent}
            setSelectedDay={setSelectedDay}
          />
        </div>

        <div className="section mb-8">
          {/* <div className="text-center text-lg">
            Stay tuned for details on how to submit your event to the calendar - we will be accepting submissions very
            soon!
          </div> */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 my-4 bg-[rgba(116,172,223,0.1)] p-12">
            <RichText content={data.pages.calendar_how_to_apply} Buttons={CMSButtons} />
            <RichText content={data.pages.calendar_community_calendar} Buttons={CMSButtons} />
          </div>
        </div>

        {/* <div className="text-sm flex flex-col gap-4">
          <p>
            <strong>Disclaimer:</strong> This calendar is a work in progress and may change a lot before Devconnect
            week. Please check back regularly for updates.
          </p>
          <div>
            <p>
              <strong>Want to be featured on our calendar?</strong> We encourage event hosts to submit their events to
              atprotocol adhering to the [devcon.org event record type].{' '}
              <strong>This is not a guarantee of inclusion as we still curate events,</strong> but is a{' '}
              <strong>requirement</strong> for community events to be considered on our calendar.
            </p>
            <p>
              <strong>How do I submit my event to atprotocol?</strong> ...
            </p>
          </div>
          <p>
            <strong>Want to build a community calendar? </strong> For your convenience, we collect all events submitted
            to atprotocol and expose them via{' '}
            <Link indicateExternal className="bold" href="https://at-slurper.onrender.com/all-events">
              https://at-slurper.onrender.com/all-events
            </Link>
            . You can also use atprotocol directly, as all data is public.
          </p>
        </div> */}
      </div>

      <Footer />
    </>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  const path = locale === 'en' ? 'calendar.mdx' : locale + '/calendar.mdx'
  const content = await client.queries.pages({ relativePath: path })
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })

  //www.notion.so/ef-events/1f5638cdc41580be9117f4963f021d8b?v=1f5638cdc415816c9277000ccc6cda85&pvs=4

  const notion = new Client({
    auth: process.env.NOTION_SECRET,
  })

  const query = {
    database_id: '1f5638cdc41580be9117f4963f021d8b',
    sorts: [
      {
        property: 'Requested event date',
        direction: 'ascending',
      },
      // {
      //   property: '[WEB] Priority (sort)',
      //   direction: 'descending',
      // },
    ],
    filter: {
      and: [
        {
          property: 'Requested event date',
          date: {
            is_not_empty: true,
          },
        },
        {
          property: 'Live in Website',
          checkbox: {
            equals: true,
          },
        },
      ],
    },
  }

  let notionEvents: any = { results: [] }

  try {
    notionEvents = await notion.databases.query(query as any)
  } catch (error) {
    console.error('Failed to fetch events from Notion:', error)
    // Continue with empty events array if Notion API fails
  }

  /*
export interface Event {
  id: string;
  name: string;
  isFairEvent?: boolean;
  isCoreEvent?: boolean;
  description: string;
  organizer: string;
  difficulty: string;
  amountPeople?: string;
  location: {
    url: string;
    text: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  timeblocks: {
    start: string;
    end: string;   
    name?: string;
    location?: string;
  }[];
  priority: number;
  categories: string[];
}

  */

  // console.log(notionEvents)

  const atprotoEvents = await fetch(
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:4000/calendar-events'
      : 'https://at-slurper.onrender.com/calendar-events'
  )
  const atprotoEventsData = await atprotoEvents.json()
  // console.log(atprotoEventsData)

  const formattedAtprotoEvents = atprotoEventsData.map((event: any) => {
    const record = event.record_passed_review

    const timeblocks = []

    if (record.start_utc) {
      let startDate = moment.utc(record.start_utc)
      let endDate

      if (record.end_utc) {
        endDate = moment.utc(record.end_utc).format('YYYY-MM-DDTHH:mm:ss[Z]')
      } else {
        endDate = startDate.format('YYYY-MM-DDTHH:mm:ss[Z]')
      }

      timeblocks.push({
        start: startDate.format('YYYY-MM-DDTHH:mm:ss[Z]'),
        end: endDate,
      })
    }

    const manualOverrides = {} as any

    if (event.id.toString() === '23') {
      manualOverrides.priority = 1
      manualOverrides.spanRows = 2
    }

    if (event.id.toString() === '29') {
      manualOverrides.priority = 2
      manualOverrides.spanRows = 3
    }

    return {
      id: event.id,
      name: record.title,
      description: record.description,
      startDate: record.start_utc,
      endDate: record.end_utc,
      location: record.location.name,
      difficulty: record.expertise,
      organizer: record.organizer.name,
      timeblocks: timeblocks,
      ...manualOverrides,
      // difficulty: record.difficulty,
    }
  })

  // const events = notionEvents.results.map((event: any) => {
  //   const formattedEvent = formatResult(event)

  //   const timeblocks = []

  //   if (formattedEvent['Requested event date']) {
  //     let startDate = moment.utc(formattedEvent['Requested event date'].startDate)
  //     let endDate

  //     if (formattedEvent['Requested event date'].endDate) {
  //       endDate = moment.utc(formattedEvent['Requested event date'].endDate).format('YYYY-MM-DDTHH:mm:ss[Z]')
  //     } else {
  //       endDate = startDate.format('YYYY-MM-DDTHH:mm:ss[Z]')
  //     }

  //     timeblocks.push({
  //       start: startDate.format('YYYY-MM-DDTHH:mm:ss[Z]'),
  //       end: endDate,
  //     })
  //   }

  //   return {
  //     id: event.id,
  //     name: formattedEvent['Event name'] || '',
  //     description: formattedEvent['Description'] || '',
  //     capacity: formattedEvent['Capacity'] || '',
  //     startDate: formattedEvent['Requested event date'],
  //     // size: formattedEvent['Size'],
  //     location: formattedEvent['Location'] || { text: 'TBD', url: '' },
  //     timeblocks: timeblocks,
  //     difficulty: 'Beginner',
  //     organizer: formattedEvent['Organization'] || '',
  //   }
  // })

  return {
    props: {
      translations,
      locale,
      content,
      events: formattedAtprotoEvents,
    },
    revalidate: 1 * 60 * 60, // 60 minutes, in seconds
  }
}

export default withTranslations(Argentina)
