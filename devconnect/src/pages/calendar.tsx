import React from 'react'
import { useCalendarStore } from 'store/calendar'
import { Client } from '@notionhq/client'
import { Footer, Header, withTranslations } from 'pages/index'
import { client } from '../../tina/__generated__/client'
import Image from 'next/image'
import styles from './calendar.module.scss'
import cn from 'classnames'
import NewSchedule from 'lib/components/event-schedule-new'
import { formatResult } from 'lib/helpers/notion-normalizer'
import moment from 'moment'
import PageTitle from 'assets/images/ba/subpage_event_calendar_2x.webp'
import Voxel from 'assets/images/ba/voxel-0.jpg'

const Argentina = (props: any) => {
  const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } = useCalendarStore()

  const coreEvents = [
    {
      id: 'event-000',
      priority: 1,
      spanRows: 2,
      name: `Ethereum World's Fair & Coworking Space`,
      description: 'Open coworking space for developers, builders, and researchers to collaborate throughout the week.',
      organizer: 'Ethereum Foundation',
      difficulty: 'All Welcome',
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
    // {
    //   id: 'event-001',
    //   priority: 2,
    //   spanRows: 3,
    //   name: 'ETH Day',
    //   description: 'A beginner-friendly workshop covering blockchain fundamentals and use cases.',
    //   organizer: 'Ethereum Foundation',
    //   difficulty: 'All Welcome',
    //   isFairEvent: true,
    //   timeblocks: [
    //     {
    //       start: '2025-11-17T10:00:00Z',
    //       end: '2025-11-17T12:00:00Z',
    //     },
    //   ],
    //   location: {
    //     url: 'https://example.com/venue1',
    //     text: 'Main Conference Hall',
    //   },
    //   // timeblocks: [
    //   //   {
    //   //     start: '2025-11-17T10:00:00Z',
    //   //     end: '2025-11-17T12:00:00Z',
    //   //   },
    //   // ],
    //   // priority: 1,
    //   // categories: ['Education', 'Blockchain', 'Workshop'],
    // },
  ]

  const events = [...props.events, ...coreEvents].map(event => {
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
      <div className="relative h-[24vh] w-full text-black bg-black flex flex-col justify-end overflow-hidden">
        <Image
          src={Voxel}
          alt="Voxel art background"
          className={cn(styles.argentina, 'object-cover absolute object-[0%,14%] h-full w-full opacity-80')}
        />

        <div className="section z-10 pb-1">
          <div className="flex justify-between items-end">
            <Image src={PageTitle} alt="Page Title" className={'contain w-[450px] translate-x-[-3%]'} />
            <div className={cn(styles.shadow, 'gap-2 pb-3 text-white hidden md:block')}>Buenos Aires, ARGENTINA</div>
          </div>
        </div>
        {/* <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50"></div> */}
      </div>
      <div className="flex flex-col text-black">
        <div className="section">
          <div className="flex justify-between gap-4 my-6">
            <div className="text-2xl hidden md:block">
              <b>November</b> 2025
            </div>
            <div className="text-sm rounded-md bg-[#74ACDF33] px-4 py-2 text-[#36364C]">
              <b>This calendar is a work in progress and will change before Devconnect week.</b> Check back regularly
              for updates.
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
          <div className="flex flex-col gap-4 my-4">
            <div className="text-2xl">
              <b>Want to be featured on our calendar?</b>
            </div>
            <div className="text-sm">
              Check back soon for more information on how to submit your event to our calendar.
            </div>
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
              <strong>Want to build a community calendar? </strong> For your convenience, we collect all events
              submitted to atprotocol and expose them via{' '}
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
  const path = locale === 'en' ? 'destino_devconnect.mdx' : locale + '/destino_devconnect.mdx'
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
        property: 'Event date',
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
          property: 'Event date',
          date: {
            is_not_empty: true,
          },
        },
        {
          property: 'Would you like your event to be live on our website',
          checkbox: {
            equals: true,
          },
        },
      ],
    },
  }

  const notionEvents = await notion.databases.query(query as any)

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

  const events = notionEvents.results.map(event => {
    const formattedEvent = formatResult(event)

    const timeblocks = []

    if (formattedEvent['Event date']) {
      let startDate = moment.utc(formattedEvent['Event date'].startDate)
      let endDate

      if (formattedEvent['Event date'].endDate) {
        endDate = moment.utc(formattedEvent['Event date'].endDate).format('YYYY-MM-DDTHH:mm:ss[Z]')
      } else {
        endDate = startDate.format('YYYY-MM-DDTHH:mm:ss[Z]')
      }

      timeblocks.push({
        start: startDate.format('YYYY-MM-DDTHH:mm:ss[Z]'),
        end: endDate,
      })
    }

    return {
      id: event.id,
      name: formattedEvent['Event name'] || '',
      description: formattedEvent['Description'] || '',
      capacity: formattedEvent['Capacity'] || '',
      startDate: formattedEvent['Event date'],
      // size: formattedEvent['Size'],
      location: formattedEvent['Location'] || { text: 'TBD', url: '' },
      timeblocks: timeblocks,
      difficulty: 'Beginner',
      organizer: formattedEvent['Organization'] || '',
    }
  })

  return {
    props: {
      translations,
      locale,
      content,
      events,
    },
    revalidate: 1 * 60 * 60, // 60 minutes, in seconds
  }
}

export default withTranslations(Argentina)
