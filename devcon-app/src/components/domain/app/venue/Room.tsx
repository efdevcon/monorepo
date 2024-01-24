import React, { useEffect, useRef } from 'react'
import { AppTabsSection } from '../app-tabs-section'
import { NoResults } from 'components/common/filter'
import css from './room.module.scss'
import CapacityIcon from 'assets/icons/capacity.svg'
import { Session as SessionType } from 'types/Session'
import { Room as RoomType } from 'types/Room'
import moment from 'moment'
import { AppNav } from 'components/domain/app/navigation'
import { Search } from 'components/common/filter/Filter'
import filterCss from 'components/domain/app/app-filter.module.scss'
import { usePanzoom, PanzoomControls } from './Venue'
import venueCss from './venue.module.scss'
import { useAppContext } from 'context/app-context'
import { useAccountContext } from 'context/account-context'
import { getFloorImage } from './Floor'
import { RoomInfo } from './RoomInfo'
import { getSessionsByDatesAndTimeslots, normalizeDate } from '../schedule/Schedule'
import { List } from '../schedule/views/List'

interface Props {
  event: any
  room: RoomType
  sessions: Array<SessionType>
}

function sessionSearch(search: string, session: SessionType): boolean {
  if (search) {
    let matchesAnySearch
    const lowerCaseSearch = search.toLowerCase()

    if (session.room && session.room.name.toLowerCase().includes(lowerCaseSearch)) matchesAnySearch = true
    if (session.title.toLowerCase().includes(lowerCaseSearch)) matchesAnySearch = true
    if (session.speakers.some(speaker => speaker.name.toLowerCase().includes(lowerCaseSearch))) matchesAnySearch = true
    if (session.description && session.description.toLowerCase().includes(lowerCaseSearch)) matchesAnySearch = true

    if (!matchesAnySearch) return false
  }

  return true
}

export const Room = (props: Props) => {
  const { now } = useAppContext()
  const { account } = useAccountContext()
  const [search, setSearch] = React.useState('')
  const pz = usePanzoom()
  const listRef1 = useRef<any>()
  const listRef2 = useRef<any>()
  const listRef3 = useRef<any>()

  const sortedSessions = props.sessions.slice().sort((a, b) => {
    return moment.utc(a.start).isBefore(moment.utc(b.start)) ? -1 : 1
  })
  const bookmarkedSessions = account?.appState?.sessions
  const upcomingSessions = sortedSessions
    .filter(i => sessionSearch(search, i))
    .filter(i => {
      const sessionIsUpcoming = now && now.isBefore(i.startTimeAsMoment)
      const sessionHasHappened = now && now.isAfter(i.endTimeAsMoment)
      const sessionIsNow = !sessionHasHappened && !sessionIsUpcoming

      return sessionIsUpcoming || sessionIsNow

      // if (!sessionIsUpcoming && !sessionIsNow) return false

      // return !moment.utc(i.start).isBefore(now)
    })
  const attendingSessions = sortedSessions
    .filter(i => sessionSearch(search, i))
    .filter(i => bookmarkedSessions?.find(bookmark => bookmark.id === i.id))
  const pastSessions = sortedSessions.filter(i => sessionSearch(search, i)).filter(i => !moment.utc(i.end).isAfter(now))

  const start = moment(props.event.startDate)
  const end = moment(props.event.endDate)
  const daysDiff = end.diff(start, 'days')

  const eventDates = [] as any

  for (let i = 0; i < daysDiff + 1; i++) {
    const nextDate = start.clone()

    nextDate.add(i, 'days')

    eventDates.push({ readable: normalizeDate(nextDate), moment: nextDate })
  }

  const upcomingSessionsData = getSessionsByDatesAndTimeslots(upcomingSessions, eventDates)
  const attendingSessionsData = getSessionsByDatesAndTimeslots(attendingSessions, eventDates)
  const pastSessionsData = getSessionsByDatesAndTimeslots(pastSessions, eventDates)

  useEffect(() => {
    if (listRef1.current) {
      if (search.length > 0) {
        listRef1.current.openAll()
      }
    }
    if (listRef2.current) {
      if (search.length > 0) {
        listRef2.current.openAll()
      }
    }
    if (listRef3.current) {
      if (search.length > 0) {
        listRef3.current.openAll()
      }
    }
  }, [search])

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: props.room.name,
          },
        ]}
      />

      <div className={venueCss['panzoom']}>
        <div className={venueCss['image']} id="image-container">
          {getFloorImage(props.room.info)}
        </div>
        <PanzoomControls pz={pz} />
      </div>

      <div className={`${filterCss['filter']} border-top`}>
        <div className="section clear-bottom-less">
          <Search placeholder="Search room sessions" onChange={setSearch} value={search} />
        </div>
      </div>

      <div className="section padding-top-less">
        <div className={css['background']}></div>

        <div className={css['room-info']}>
          <div className="h2 clear-bottom-less">
            <RoomInfo room={props.room} />
          </div>
          {props.room.info && <p className="h1 bold clear-bottom-less">{props.room.info}</p>}
          {props.room.capacity && (
            <div className="label">
              <CapacityIcon className={`icon ${css['capacity-icon']}`} />
              <p>Capacity - {props.room.capacity} </p>
              {/* <InfoIcon /> */}
            </div>
          )}
        </div>

        <AppTabsSection
          className={css['tabs']}
          title="Sessions"
          tabs={[
            {
              title: 'Upcoming',
              content: (
                <div>
                  {upcomingSessions && (
                    <List
                      now={now}
                      sessionTimeslots={upcomingSessionsData.sessionTimeslots}
                      timeslotOrder={upcomingSessionsData.timeslotOrder}
                      sessionsByTime={upcomingSessionsData.sessionsByTime}
                      ref={listRef1}
                    />
                  )}
                  {upcomingSessions.length === 0 && <NoResults />}
                </div>
              ),
            },
            {
              title: 'Attending',
              content: (
                <div>
                  {attendingSessions && (
                    <List
                      now={now}
                      sessionTimeslots={attendingSessionsData.sessionTimeslots}
                      timeslotOrder={attendingSessionsData.timeslotOrder}
                      sessionsByTime={attendingSessionsData.sessionsByTime}
                      ref={listRef2}
                    />
                  )}
                  {attendingSessions.length === 0 && <NoResults />}
                </div>
              ),
            },
            {
              title: 'Past',
              content: (
                <div>
                  {pastSessions && (
                    <List
                      now={now}
                      sessionTimeslots={pastSessionsData.sessionTimeslots}
                      timeslotOrder={pastSessionsData.timeslotOrder}
                      sessionsByTime={pastSessionsData.sessionsByTime}
                      ref={listRef3}
                    />
                  )}
                  {pastSessions.length === 0 && <NoResults />}
                </div>
              ),
            },
          ]}
        />
      </div>
    </>
  )
}
