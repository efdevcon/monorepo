import React from 'react'
import Head from 'next/head'
import NewSchedule from 'common/components/new-schedule'
import { Button } from 'lib/components/button'
import Login from 'common/components/login'
import { useAccountContext } from 'context/account-context'
import Timeline from 'common/components/new-schedule/timeline'
import { dummyEvents } from 'common/components/new-schedule/dummy-data'
import { useCalendarStore } from 'store/calendar'
import { Footer, Header, withTranslations } from 'pages/index'
import { client } from '../../tina/__generated__/client'
import Image from 'next/image'
import styles from './argentina.module.scss'
import Oblisk from '../../public/scroll-video/Oblisk_4K0125.webp'
import cn from 'classnames'

const Argentina = () => {
  const user = useAccountContext()
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
          <NewSchedule />
        </div>

        {/* <Timeline events={dummyEvents} /> */}
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

  return {
    props: {
      translations,
      locale,
      content,
    },
    revalidate: 1 * 60 * 60, // 60 minutes, in seconds
  }
}

export default withTranslations(Argentina)
