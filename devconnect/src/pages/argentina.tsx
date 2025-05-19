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

const Argentina = () => {
  const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } = useCalendarStore()

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
          <div className="flex justify-between gap-4 items-end"></div>
          <NewSchedule
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

  // https://www.notion.so/ef-events/1f5638cdc41580be9117f4963f021d8b?v=1f5638cdc415816c9277000ccc6cda85&pvs=4

  const notion = new Client({
    auth: process.env.NOTION_SECRET,
  })

  const query = {
    database_id: '1f5638cdc41580be9117f4963f021d8b',
    sorts: [
      {
        property: '[HOST] Event Date',
        direction: 'ascending',
      },
      {
        property: '[WEB] Priority (sort)',
        direction: 'descending',
      },
    ],
    filter: {
      and: [
        {
          property: '[HOST] Event Date',
          date: {
            is_not_empty: true,
          },
        },
        {
          property: '[WEB] Live',
          checkbox: {
            equals: true,
          },
        },
      ],
    },
  }

  const events = await notion.databases.query(query as any)

  console.log(events)

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
