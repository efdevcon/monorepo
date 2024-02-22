import React from 'react'
import css from './side-events.module.scss'
import { Link, LinkList } from 'components/common/link'
import { CollapsedSection, CollapsedSectionContent, CollapsedSectionHeader } from 'components/common/collapsed-section'
import { Search, Tags, Basic, FilterFoldout } from 'components/common/filter/Filter'
import { SideEventCard, SideEvent } from './SideEventCard'
import LogoImage from 'assets/images/test-asset.svg'
import Image from "next/legacy/image"
import ChevronUp from 'assets/icons/chevron-up.svg'
import imageBogota from 'assets/images/bogota-city.png'
import { AppNav } from 'components/domain/app/navigation'
import filterCss from 'components/domain/app/app-filter.module.scss'
import offdevcon from 'assets/images/off-devcon.png'
import { Date, normalizeDate } from '../schedule/Schedule'
import { List } from '../schedule/views/List'
import { useAppContext } from 'context/app-context'
import moment from 'moment'
import { NoResults } from 'components/common/filter'
import { ButtonOverlay } from '../button-overlay'
import { Button } from 'components/common/button'

/*
export interface Session {
  id: string
  speakers: Speaker[]
  title: string
  track: string
  duration: number
  start: number
  end: number
  startTimeAsMoment?: Moment
  endTimeAsMoment?: Moment
  day?: string
  date?: string
  dayOfWeek?: string
  room?: Room
  type?: string
  description?: string
  abstract?: string
  expertise?: string
  image?: string
  resources?: string[]
  tags?: string[]
}

*/

const getDates = (sideEvents: SideEvent[]): Date[] => {
  const dates = {} as { [key: Date['readable']]: Date }
  const order = [] as Date['readable'][]

  sideEvents.forEach(sideEvent => {
    const startDate = moment.utc(sideEvent.start)
    const normalizedDate = normalizeDate(startDate)

    if (!dates[normalizedDate]) {
      dates[normalizedDate] = {
        readable: normalizedDate,
        moment: startDate,
      }
      order.push(normalizedDate)
    }
  })

  return order.map(date => dates[date])
}

export const SideEvents = (props: any) => {
  // console.log(openDays, 'open days')
  const [search, setSearch] = React.useState('')
  const { now } = useAppContext()

  const sideEvents: SideEvent[] = props.scheduleData.map((event: any) => {
    return {
      id: event['Name'],
      title: event['Name'],
      start: event['Date'].startDate,
      end: event['Date'].endDate,
      location: event['Where'],
      capacity: event['Capacity'],
      type: event['Type of event'],
      url: event['Registration Link'],
      image: event['Cover image'] && event['Cover image'][0] && event['Cover image'][0].file.url,
    }
  })

  const dates = getDates(sideEvents)

  const [openDays, setOpenDays] = React.useState(
    dates.reduce((acc: { [key: string]: boolean }, date) => {
      acc[date.readable] = true

      return acc
    }, {})
  )

  const filteredSideEvents = sideEvents.filter(sideEvent => {
    return sideEvent.title.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: 'Side Events',
            to: '/app/side-events',
          },
        ]}
      />
      <div className="section">
        <div className="content">
          {/* <div className={`${css['hero']}`}>
            <div className={`${css['hero-content']}`}>
              <div className={css['image-container']}>
                <Image src={imageBogota} objectFit="cover" alt={'Devcon Side event'} layout="fill" />
              </div>

              <div className={`${css['details']}`}>
                <div>
                  <LogoImage />

                  <div className={css['title']}>
                    <h2 className="bold font-primary font-xxl">Devcon Bogota</h2>
                    <h2 className="font-primary font-xxl">Side Events</h2>
                  </div>
                </div>

                <p className="font-sm">
                  <b>Note:</b> These events are not organized or endorsed by Devcon in any capacity beyond listings and
                  schedule integration for ease of access.
                </p>
              </div>
            </div>
          </div> */}

          <p className="font-lg clear-bottom clear-top-less">
            <b>Note:</b> These events are not organized or endorsed by Devcon in any capacity beyond listings and
            schedule integration for ease of access.
          </p>

          <div className={css['curator']}>
            <div className={css['title']}>
              <p className="bold">Curated by:</p>
              <Image src={offdevcon} alt={'OffDevcon logo'} />
            </div>
            <div className={`${css['submit-event']} label neutral bold`}>Submit Event</div>
          </div>

          <CollapsedSection>
            <CollapsedSectionHeader title="Additional Resources" />
            <CollapsedSectionContent>
              <LinkList>
                {/* TODO: Add event links here */}
                <Link to="https://devcon.org">Bogota Blockchain Week</Link>
                <Link to="https://devcon.org">Googlesheets Event List</Link>
                <Link to="https://devcon.org">Ethereum Jesus Bogota Eventlist</Link>
              </LinkList>
            </CollapsedSectionContent>
          </CollapsedSection>
        </div>
      </div>

      <div className={filterCss['filter']}>
        <div className={`section ${css['search']}`}>
          <Search
            placeholder="Find an event"
            value={search}
            onChange={value => {
              setSearch(value)

              const openState = {} as any

              dates.forEach(date => {
                openState[date.readable] = true
              })

              setOpenDays(openState)
            }}
          />
        </div>
      </div>
      <div className="section margin-top-less">
        {filteredSideEvents.length === 0 ? (
          <NoResults />
        ) : (
          dates.map(date => {
            const dayIsNow = now && now.isSame(date.moment, 'day')
            const eventsForDay = filteredSideEvents.filter(
              sideEvent => date.moment && date.moment.isSame(moment.utc(sideEvent.start), 'day')
            )

            if (eventsForDay.length === 0) return null

            return (
              <CollapsedSection
                sticky
                key={date.readable}
                open={openDays[date.readable]}
                setOpen={() => {
                  const isOpen = openDays[date.readable]

                  const nextOpenState = {
                    ...openDays,
                    [date.readable]: true,
                  }

                  if (isOpen) {
                    delete nextOpenState[date.readable]
                  }

                  setOpenDays(nextOpenState)
                }}
              >
                <div className={css['anchor']} id={date.readable}></div>
                <CollapsedSectionHeader className={css['day-header']} sticky>
                  <p className="font-sm-fixed bold">
                    {date.moment ? date.moment.format('dddd, MMM Do') : date.readable}
                    <span className={css['header-today-indicator']}>{dayIsNow && 'Today'}</span>
                  </p>
                </CollapsedSectionHeader>
                <CollapsedSectionContent>
                  <div className="clear-top-less">
                    {eventsForDay.map(sideEvent => {
                      return <SideEventCard key={sideEvent.id} event={sideEvent} />
                    })}
                  </div>
                </CollapsedSectionContent>
              </CollapsedSection>
            )
          })
        )}

        <ButtonOverlay
          buttons={[
            {
              id: 'scroll-up',
              className: css['collapse'],
              onClick: () => {
                window.scrollTo(0, 0)
              },
              render: () => <ChevronUp />,
            },
          ]}
        />
      </div>
    </>
  )
}
