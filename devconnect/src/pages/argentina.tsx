import React from 'react'
import { useAccountContext } from 'context/account-context'
import { useCalendarStore } from 'store/calendar'
import { Client } from '@notionhq/client'
import { Footer, Header, withTranslations } from 'pages/index'
import { client } from '../../tina/__generated__/client'
import Image from 'next/image'
import styles from './argentina.module.scss'
import Oblisk from '../../public/scroll-video/Oblisk_4K0125.webp'
import cn from 'classnames'
import NewSchedule from 'lib/components/event-schedule-new'
import { formatResult } from 'lib/helpers/notion-normalizer'
// import dateFns from 'date-fns'
import moment from 'moment'

const Argentina = (props: any) => {
  const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } = useCalendarStore()

  console.log(props.events)

  return (
    <>
      <Header active />
      <div className="relative h-[20vh] w-full text-black bg-black flex flex-col justify-end overflow-hidden">
        <Image
          src={Oblisk}
          alt="Argentina"
          className={cn(styles.argentina, 'object-cover absolute h-full w-full opacity-80')}
        />
        <div className="section z-10 pb-4">
          <div className="flex gap-4">
            <div className="text-lg bg-black/60 text-white  px-4 py-1 rounded-md border border-solid border-black backdrop-blur-sm">
              Devconnect Argentina - Event Calendar
            </div>
            {/* <div className="flex gap-2 items-center">
              <div className="text-sm text-gray-500">Filter Goes here</div>
              <Button variant="secondary">Login with Zupass</Button>
            </div> */}
          </div>
        </div>
        {/* <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50"></div> */}
      </div>
      <div className="flex flex-col gap-4 text-black">
        <div className="section my-1 mb-8">
          <NewSchedule
            events={props.events}
            selectedEvent={selectedEvent}
            selectedDay={selectedDay}
            setSelectedEvent={setSelectedEvent}
            setSelectedDay={setSelectedDay}
          />
        </div>
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
    // sorts: [
    //   {
    //     property: '[HOST] Event Date',
    //     direction: 'ascending',
    //   },
    //   {
    //     property: '[WEB] Priority (sort)',
    //     direction: 'descending',
    //   },
    // ],
    // filter: {
    //   and: [
    //     {
    //       property: '[HOST] Event Date',
    //       date: {
    //         is_not_empty: true,
    //       },
    //     },
    //     {
    //       property: '[WEB] Live',
    //       checkbox: {
    //         equals: true,
    //       },
    //     },
    //   ],
    // },
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

  const events = notionEvents.results
    .map(event => {
      const formattedEvent = formatResult(event)

      const startDate = moment('2025-11-17T09:00:00Z').add(Math.floor(Math.random() * 6), 'days')

      return {
        id: event.id,
        name: formattedEvent['Event name'],
        description: formattedEvent['Description'] || '',
        capacity: formattedEvent['Capacity'],
        size: formattedEvent['Size'],
        location: formattedEvent['Location'] || { text: 'TBD', url: '' },
        timeblocks: [
          {
            start: startDate.format('YYYY-MM-DDTHH:mm:ss[Z]'),
            end: startDate.clone().add(4, 'hours').format('YYYY-MM-DDTHH:mm:ss[Z]'),
          },
        ],
        difficulty: 'Beginner',
      }
    })
    .sort((a, b) => moment(a.timeblocks[0].start).valueOf() - moment(b.timeblocks[0].start).valueOf())

  // @ts-ignore
  events[0].isFairEvent = true
  // @ts-ignore
  events[1].isCoreEvent = true

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
