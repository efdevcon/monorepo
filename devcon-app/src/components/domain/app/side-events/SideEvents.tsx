import React from 'react'
import css from './side-events.module.scss'
import { Link, LinkList } from 'components/common/link'
import { CollapsedSection, CollapsedSectionContent, CollapsedSectionHeader } from 'components/common/collapsed-section'
import { Search } from 'components/common/filter/Filter'
import { SideEventCard, SideEvent } from './SideEventCard'
import ChevronUp from 'assets/icons/chevron-up.svg'
import { AppNav } from 'components/domain/app/navigation'
import filterCss from 'components/domain/app/app-filter.module.scss'
import { Date, normalizeDate } from '../schedule/Schedule'
import { useAppContext } from 'context/app-context'
import moment from 'moment'
import { NoResults } from 'components/common/filter'
import { ButtonOverlay } from '../button-overlay'
import { PageIntroduction } from 'components/domain/app/home/Home'
import SideEventsBackground from 'assets/images/side-events-background.png'

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
      image: (event['Cover image'] && event['Cover image'][0] && event['Cover image'][0].file?.url) || '',
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
            to: '/side-events',
          },
        ]}
      />
      <div className="section">
        <PageIntroduction
          // title="Welcome to the Devcon Passport"
          bodyLeftTitle="Community Curated Side Events"
          bodyLeftText="Note: These events are not organized or endorsed by Devcon in any capacity beyond listings and schedule integration for ease of access."
          backgroundAlt="Side events logo"
          background={SideEventsBackground}
          ctaText="Created by COLOMBIA BLOCKCHAIN WEEK"
          button={{
            text: 'Submit Event',
            url: 'https://notionforms.io/forms/devcon-side-events-1',
          }}
        />

        <div className="content">
          {/* <p className="font-lg clear-bottom clear-top-less">
            <b>Note:</b> These events are not organized or endorsed by Devcon in any capacity beyond listings and
            schedule integration for ease of access.
          </p>

          <div className={css['curator']}>
            <div className={css['title']}>
              <p>Curated by:</p>
              <p className="bold font-md text-uppercase">Colombia Blockchain Week</p>
            </div>
            <div className={`${css['submit-event']} label neutral bold`}>
              <Link to="https://notionforms.io/forms/colombia-blockchain-week">Submit Event</Link>
            </div>
          </div> */}

          <CollapsedSection>
            <CollapsedSectionHeader title="Additional Resources" />
            <CollapsedSectionContent>
              <LinkList>
                <Link style={{ borderTop: 'none' }} to="https://devcon.org/devcon-week/">
                  Devcon Week
                </Link>
                <Link to="https://colombiablockchain.xyz/">Colombia Blockchain Week</Link>
                <Link to="https://docs.google.com/spreadsheets/d/1KtyFTb_W282bQ1xoVA5rlTwTDz3QfhswWIVpXhpbQIc/edit#gid=1286053629">
                  Crypto Nomads Club
                </Link>
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
                  <p className="app-header bold">
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
