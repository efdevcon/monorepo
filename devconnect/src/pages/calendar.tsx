import React from 'react'
import { useCalendarStore } from 'store/calendar'
import { Footer, Header, withTranslations } from 'pages/index'
import { client } from '../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import Image from 'next/image'
import styles from './calendar.module.scss'
import cn from 'classnames'
import moment from 'moment'
import PageTitle from 'assets/images/ba/subpage_event_calendar_2x.webp'
import Voxel from 'assets/images/ba/voxel-0.jpg'
import RichText from 'lib/components/tina-cms/RichText'
import { CMSButtons } from 'common/components/voxel-button/button'
import CalendarLayout from 'lib/components/event-schedule-new/layout'
import { Separator } from 'lib/components/ui/separator'
import { apiResultToCalendarFormat } from 'lib/components/event-schedule-new/atproto-to-calendar-format'
import VoxelButton from 'lib/components/voxel-button/button'
import NextLink from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const Argentina = (props: any) => {
  // const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const { data }: { data: any } = useTina(props.content)

  const events = props.events

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
            <VoxelButton color="purple-1" size="sm" fill className="shrink-0 hidden lg:flex self-end mb-3">
              <NextLink href="https://devconnect.org/community-events" className="flex items-center gap-1.5 ">
                Submit Your Side Event
                <ArrowUpRight className="w-4 h-4 mb-0.5" />
              </NextLink>
            </VoxelButton>
            {/* <div className={cn(styles.shadow, 'gap-2 pb-3 text-white hidden md:block')}>Buenos Aires, ARGENTINA</div> */}
          </div>
        </div>

        <div className={styles['devconnect-overlay']}></div>
        {/* <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50"></div> */}
      </div>
      <div className="flex flex-col text-black mt-6">
        <CalendarLayout
          events={events} // .filter((event: any) => event.isCoreEvent)}
          isCommunityCalendar={false}
        />

        {/* <div className="section">
          <Separator className="my-8 mt-12" />
        </div>

        <CalendarLayout
          events={events.filter((event: any) => !event.isCoreEvent)}
          isCommunityCalendar
          selectedEvent={selectedEvent}
          selectedDay={selectedDay}
          setSelectedEvent={setSelectedEvent}
          setSelectedDay={setSelectedDay}
        /> */}

        <div className="section mb-8 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 my-4 bg-[rgba(116,172,223,0.1)] p-4 md:p-12">
            <RichText content={data.pages.calendar_how_to_apply} Buttons={CMSButtons} />
            <RichText content={data.pages.calendar_community_calendar} Buttons={CMSButtons} />
          </div>
        </div>
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

  const atprotoEvents = await fetch(
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:4000/calendar-events'
      : 'https://at-slurper.onrender.com/calendar-events'
  )
  const atprotoEventsData = await atprotoEvents.json()

  const formattedAtprotoEvents = apiResultToCalendarFormat(atprotoEventsData)

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
