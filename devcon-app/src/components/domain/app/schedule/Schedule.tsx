import React, { useEffect, useState, useRef } from 'react'
import css from './schedule.module.scss'
import { AppNav } from 'components/domain/app/navigation'
import { Search, Tags, Basic, FilterFoldout } from 'components/common/filter/Filter'
import { NoResults } from 'components/common/filter'
import { List } from './views/List'
import { Session } from 'types/Session'
import moment, { Moment } from 'moment'
import SwipeToScroll from 'components/common/swipe-to-scroll'
import { useAccountContext } from 'context/account-context'
import filterCss from 'components/domain/app/app-filter.module.scss'
import { useAppContext } from 'context/app-context'
import { Room } from 'types/Room'
import { ShareScheduleModal } from './ShareScheduleModal'
import IconAdded from 'assets/icons/person-added.svg'
import IconAdded2 from 'assets/icons/person-added-2.svg'
import { DownloadScheduleModal } from './DownloadScheduleModal'

type Timeslot = {
  time: number
  sessions: Session[]
}

export type Date = {
  readable: string
  moment?: Moment
}

export type ScheduleInformation = {
  sessionTimeslots: {
    [key: number]: Session[]
  }
  sessionsByTime: {
    date: Date
    timeslots: Timeslot[]
  }[]
  timeslotOrder: number[]
}

export const normalizeDate = (moment: Moment) => {
  return moment.format('MMM Do')
}

const useFormatSessions = (sessions: Session[]) => {
  return React.useMemo(() => {
    return sessions.map(session => {
      const startTimeAsMoment = moment.utc(session.start)
      const endTimeAsMoment = startTimeAsMoment.clone().add(session.duration, 'minutes')

      return {
        ...session,
        startTimeAsMoment,
        endTimeAsMoment,
        day: startTimeAsMoment.format('dddd, MMM Do'),
        date: normalizeDate(startTimeAsMoment),
      }
    })
  }, [sessions])
}

export const getSessionsByDatesAndTimeslots = (sessions: Session[], dates: Date[]) => {
  const sessionTimeslots = {} as ScheduleInformation['sessionTimeslots']
  const timeslotOrder = [] as ScheduleInformation['timeslotOrder']

  sessions.forEach(session => {
    if (!sessionTimeslots[session.start]) {
      timeslotOrder.push(session.start)
      sessionTimeslots[session.start] = []
    }

    sessionTimeslots[session.start].push(session)
  })

  const sessionsByTime = dates.map((date: Date) => {
    return {
      date,
      timeslots: timeslotOrder.sort().reduce((acc, time) => {
        const startTime = moment.utc(time)

        if (startTime.isSame(date.moment, 'day')) {
          const sessionsInTimeslot = sessionTimeslots[time].sort((a, b) => {
            if (!a.endTimeAsMoment) return 1

            return a.endTimeAsMoment.isBefore(b.endTimeAsMoment) ? -1 : 1
          })

          acc.push({ time, sessions: sessionsInTimeslot })
        }

        return acc
      }, [] as Timeslot[]),
    }
  })

  return { sessionsByTime, sessionTimeslots, timeslotOrder, dates }
}

export const multiSelectFilter = (selectedFilter: { [key: string]: boolean }, key?: string) => {
  const filter = Object.keys(selectedFilter)
  const filterIsActive = filter.length > 0

  if (filterIsActive) {
    if (!key) return false
    if (!selectedFilter[key]) return false
  }

  return true
}

const ScheduleContext: any = React.createContext({})

export const useScheduleContext = () => {
  return React.useContext(ScheduleContext)
}

export const ScheduleState = (props: any) => {
  const { sessions: sessionsBeforeFormatting, userSchedule, tracks, event } = props
  const personalAgenda = !!userSchedule
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list')
  const [basicFilter, setBasicFilter] = useState(personalAgenda ? 'personal' : 'all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedTracks, setSelectedTracks] = useState({} as { [key: string]: boolean })
  const [selectedRooms, setSelectedRooms] = useState({} as { [key: string]: boolean })
  const [selectedSessionTypes, setSelectedSessionTypes] = useState({} as { [key: string]: boolean })
  const [selectedExpertise, setSelectedExpertise] = useState({} as { [key: string]: boolean })
  const [dateFilter, setDateFilter] = useState<{ readable: string; moment?: Moment | null }>({
    readable: 'all',
  })

  return (
    <ScheduleContext.Provider
      value={{
        search,
        setSearch,
        view,
        setView,
        basicFilter,
        setBasicFilter,
        favoritesOnly,
        setFavoritesOnly,
        selectedTracks,
        setSelectedTracks,
        selectedSessionTypes,
        setSelectedSessionTypes,
        selectedRooms,
        setSelectedRooms,
        selectedExpertise,
        setSelectedExpertise,
        dateFilter,
        setDateFilter,
      }}
    >
      {props.children}
    </ScheduleContext.Provider>
  )
}

export const Schedule = (props: any) => {
  const { sessions: sessionsBeforeFormatting, userSchedule, tracks, event } = props
  const personalAgenda = !!userSchedule

  const {
    search,
    setSearch,
    view,
    basicFilter,
    setBasicFilter,
    favoritesOnly,
    setFavoritesOnly,
    selectedTracks,
    setSelectedTracks,
    selectedSessionTypes,
    setSelectedSessionTypes,
    selectedRooms,
    setSelectedRooms,
    selectedExpertise,
    setSelectedExpertise,
    dateFilter,
    setDateFilter,
  }: any = useScheduleContext()

  const { account } = useAccountContext()
  const { now } = useAppContext()
  // const [search, setSearch] = React.useState('')
  // const [view, setView] = React.useState('list')
  // const [basicFilter, setBasicFilter] = React.useState(personalAgenda ? 'personal' : 'upcoming')
  // const [favoritesOnly, setFavoritesOnly] = React.useState(false)
  // const [selectedTracks, setSelectedTracks] = React.useState({} as { [key: string]: boolean })
  // const [selectedRooms, setSelectedRooms] = React.useState({} as { [key: string]: boolean })
  // const [selectedSessionTypes, setSelectedSessionTypes] = React.useState({} as { [key: string]: boolean })
  // const [selectedExpertise, setSelectedExpertise] = React.useState({} as { [key: string]: boolean })
  // const [dateFilter, setDateFilter] = React.useState<{ readable: string; moment?: Moment | null }>({ readable: 'all' })

  const listRef = useRef<any>()

  const start = moment(event.startDate)
  const end = moment(event.endDate)
  const daysDiff = end.diff(start, 'days')

  const eventDates = [] as any

  for (let i = 0; i < daysDiff + 1; i++) {
    const nextDate = start.clone()

    nextDate.add(i, 'days')

    eventDates.push({ readable: normalizeDate(nextDate), moment: nextDate })
  }

  // When selecting a specific day, open it immediately
  // When selecting all days, close them to provide a hollistic view of the events
  // useEffect(() => {
  //   if (listRef.current) {
  //     if (dateFilter.readable !== 'all') {
  //       listRef.current.openAll()
  //     } else if (dateFilter.readable) {
  //       listRef.current.closeAll()
  //     }
  //   }
  // }, [dateFilter])

  // useEffect(() => {
  //   if (listRef.current) {
  //     if (basicFilter !== 'all') {
  //       listRef.current.openAll()
  //     } else if (basicFilter) {
  //       listRef.current.closeAll()
  //     }
  //   }
  // }, [basicFilter])

  // // Open all days when searching
  // useEffect(() => {
  //   if (listRef.current) {
  //     if (search.length > 0) {
  //       listRef.current.openAll()
  //     }
  //   }
  // }, [search])

  const bookmarkedSessions = account?.appState?.sessions ?? []
  const favoritedSpeakers = account?.appState?.speakers ?? []

  // Format sessions (memoized)
  const formattedSessions = useFormatSessions(sessionsBeforeFormatting)

  const filteredSessions = formattedSessions.filter((session: Session) => {
    // Filter by search
    if (search) {
      let matchesAnySearch
      const lowerCaseSearch = search.toLowerCase()

      if (session.room && session.room.name.toLowerCase().includes(lowerCaseSearch)) matchesAnySearch = true
      if (session.title.toLowerCase().includes(lowerCaseSearch)) matchesAnySearch = true
      if (session.speakers.some(speaker => speaker.name.toLowerCase().includes(lowerCaseSearch)))
        matchesAnySearch = true
      if (session.description && session.description.toLowerCase().includes(lowerCaseSearch)) matchesAnySearch = true
      if (session.tags && session.tags?.split(',').some(tag => tag.toLowerCase().includes(lowerCaseSearch)))
        matchesAnySearch = true

      if (!matchesAnySearch) return false
    }

    // Filter by interested
    if (favoritesOnly) {
      const speakerIsFavorited = favoritedSpeakers?.some(speaker =>
        session.speakers.some(sessionSpeaker => speaker === sessionSpeaker.id)
      )

      if (!speakerIsFavorited) return false
      // const bookmarkedSession = bookmarkedSessions?.find(bookmark => bookmark.id === session.id)
      // if (bookmarkedSession?.level !== 'interested') return false
    }

    // Filter by attending/past/upcoming
    if (basicFilter === 'attending') {
      const bookmarkedSession = bookmarkedSessions?.find(
        bookmark => bookmark.id === session.id && bookmark.level === 'attending'
      )

      if (!bookmarkedSession) return false
    } else if (basicFilter === 'interested') {
      const bookmarkedSession = bookmarkedSessions?.find(
        bookmark => bookmark.id === session.id && bookmark.level === 'interested'
      )

      if (!bookmarkedSession) return false
    } else if (basicFilter === 'past') {
      const sessionHasHappened = now && now.isAfter(session.endTimeAsMoment)

      if (!sessionHasHappened) return false
    } else if (basicFilter === 'upcoming') {
      const sessionIsUpcoming = now && now.isBefore(session.startTimeAsMoment)
      const sessionHasHappened = now && now.isAfter(session.endTimeAsMoment)
      const sessionIsNow = !sessionHasHappened && !sessionIsUpcoming

      if (!sessionIsUpcoming && !sessionIsNow) return false
    } else if (basicFilter === 'live') {
      const sessionHasHappened = now && now.isAfter(session.endTimeAsMoment)
      const sessionIsUpcoming = now && now.isBefore(session.startTimeAsMoment)
      const sessionIsNow = !sessionHasHappened && !sessionIsUpcoming

      if (!sessionIsNow) return false
    }

    // Filter by tracks
    const trackMatches = multiSelectFilter(selectedTracks, session.track)
    const roomMatches = multiSelectFilter(selectedRooms, session.room?.name)
    const difficultyMatches = multiSelectFilter(selectedExpertise, session.expertise)
    const typeMatches = multiSelectFilter(selectedSessionTypes, session.type)

    if (!trackMatches) return false
    if (!roomMatches) return false
    if (!difficultyMatches) return false
    if (!typeMatches) return false

    // Filter by day
    if (dateFilter.readable !== 'all') {
      const sessionIsSameDay = session.date === dateFilter.readable

      if (!sessionIsSameDay) return false
    }

    if (dateFilter.readable === 'Invalid date') {
      return false
    }

    return true
  })

  // Whenever a filter changes, open all the accordions
  useEffect(() => {
    if (listRef.current) {
      listRef.current.openAll()
    }
  }, [
    search,
    view,
    basicFilter,
    favoritesOnly,
    selectedTracks,
    selectedRooms,
    selectedSessionTypes,
    selectedExpertise,
    dateFilter,
  ])

  const { sessionTimeslots, timeslotOrder, sessionsByTime } = getSessionsByDatesAndTimeslots(
    filteredSessions,
    eventDates
  )

  const noResults = filteredSessions.length === 0

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: 'Agenda',
          },
        ]}
        renderRight={() => {
          // if (!account) return null
          const starProps = {
            onClick: () => setFavoritesOnly(!favoritesOnly),
            style: {
              cursor: 'pointer',
            },
          }

          return (
            <>
              {account && <ShareScheduleModal />}
              {account && (
                <DownloadScheduleModal
                  sessions={bookmarkedSessions
                    .map(i =>
                      sessionsBeforeFormatting.find((x: Session) => {
                        return x.id === i.id
                      })
                    )
                    .filter(i => !!i)
                    .sort((a, b) => a.start - b.start)}
                />
              )}
              <>
                {favoritesOnly ? (
                  <IconAdded {...starProps} className="icon fill-red" />
                ) : (
                  <IconAdded2 {...starProps} style={{ opacity: 0.8 }} />
                )}
              </>
            </>
          )
        }}
      />

      <div className="section">
        <div className="expand-right">
          <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
            <div className={css['basic-filter-container']}>
              <Basic
                value={basicFilter}
                onChange={setBasicFilter}
                options={
                  personalAgenda
                    ? [
                        {
                          text: 'Personalized Schedule',
                          value: 'personal',
                        },
                      ]
                    : [
                        {
                          text: 'All',
                          value: 'all',
                        },
                        {
                          text: 'Upcoming',
                          value: 'upcoming',
                        },
                        {
                          text: 'Attending',
                          value: 'attending',
                        },
                        {
                          text: 'Live',
                          value: 'live',
                        },
                        {
                          text: 'Interested',
                          value: 'interested',
                        },
                        {
                          text: 'Past',
                          value: 'past',
                        },
                      ]
                }
              />
            </div>
          </SwipeToScroll>
        </div>

        {personalAgenda && (
          <p>
            You&apos;re watching the schedule of <b>{userSchedule.username}</b>
          </p>
        )}
      </div>

      {!personalAgenda && (
        <div className={filterCss['filter']}>
          <div className="section">
            <Search placeholder="Find a session" value={search} onChange={setSearch} timeout={300} />

            <div className={filterCss['foldout']}>
              <FilterFoldout
                active={
                  Math.max(
                    Object.keys(selectedTracks).length,
                    Object.keys(selectedRooms).length,
                    Object.keys(selectedExpertise).length,
                    Object.keys(selectedSessionTypes).length
                  ) > 0
                }
                renderRight={({ setOpen }: any) => {
                  return (
                    <div className={filterCss['actions']}>
                      <button
                        className={`app hover sm thin-borders`}
                        onClick={() => {
                          setSelectedTracks({})
                          setSelectedRooms({})
                          setSelectedSessionTypes({})
                          setSelectedExpertise({})
                        }}
                      >
                        Reset
                      </button>

                      <button className={`app hover sm thin-borders`} onClick={() => setOpen(false)}>
                        Close
                      </button>
                    </div>
                  )
                }}
              >
                {(open, setOpen) => {
                  return (
                    <div className={filterCss['foldout-content']}>
                      <div className={filterCss['filter-section']}>
                        <p className="app-header clear-bottom-less">Tracks</p>
                        <Tags
                          value={selectedTracks}
                          onChange={nextValue => {
                            const isAlreadySelected = selectedTracks[nextValue]

                            const nextState = {
                              ...selectedTracks,
                            }

                            if (isAlreadySelected) {
                              delete nextState[nextValue]
                            } else {
                              nextState[nextValue] = true
                            }

                            setSelectedTracks(nextState)
                          }}
                          options={tracks
                            .filter((track: string) => !!track)
                            .map((i: string) => {
                              return {
                                text: i,
                                value: i,
                              }
                            })}
                        />
                      </div>

                      <div className={filterCss['filter-section']}>
                        <p className="app-header clear-bottom-less">Expertise</p>
                        <Tags
                          value={selectedExpertise}
                          onChange={nextValue => {
                            const isAlreadySelected = selectedExpertise[nextValue]

                            const nextState = {
                              ...selectedExpertise,
                            }

                            if (isAlreadySelected) {
                              delete nextState[nextValue]
                            } else {
                              nextState[nextValue] = true
                            }

                            setSelectedExpertise(nextState)
                          }}
                          options={props.expertiseLevels.map((i: string) => {
                            return {
                              text: i,
                              value: i,
                            }
                          })}
                        />
                      </div>

                      <div className={filterCss['filter-section']}>
                        <p className="app-header clear-bottom-less">Session Type</p>
                        <Tags
                          value={selectedSessionTypes}
                          onChange={nextValue => {
                            const isAlreadySelected = selectedSessionTypes[nextValue]

                            const nextState = {
                              ...selectedSessionTypes,
                            }

                            if (isAlreadySelected) {
                              delete nextState[nextValue]
                            } else {
                              nextState[nextValue] = true
                            }

                            setSelectedSessionTypes(nextState)
                          }}
                          options={props.sessionTypes.map((i: string) => {
                            return {
                              text: i,
                              value: i,
                            }
                          })}
                        />
                      </div>

                      <div className={filterCss['filter-section']}>
                        <p className="app-header clear-bottom-less">Room</p>
                        <Tags
                          value={selectedRooms}
                          onChange={nextValue => {
                            const isAlreadySelected = selectedRooms[nextValue]

                            const nextState = {
                              ...selectedRooms,
                            }

                            if (isAlreadySelected) {
                              delete nextState[nextValue]
                            } else {
                              nextState[nextValue] = true
                            }

                            setSelectedRooms(nextState)
                          }}
                          options={props.rooms
                            .filter((i: Room) => i.capacity && i.capacity > 0)
                            .sort((a: Room, b: Room) => ((a.capacity || 0) > (b.capacity || 0) ? -1 : 1))
                            .map((i: Room) => {
                              return {
                                text: i.name,
                                value: i.name,
                              }
                            })}
                        />
                      </div>

                      <div className={filterCss['actions']} style={{ marginTop: '8px' }}>
                        <button className={`app hover sm thin-borders`} onClick={() => setOpen(false)}>
                          Close
                        </button>
                      </div>
                    </div>
                  )
                }}
              </FilterFoldout>

              <div className={filterCss['right']}>
                <div>
                  <p className="font-xs-fixed">Current Filter:</p>
                  <p className={filterCss['filter-indicator']}>
                    {(() => {
                      const computeFilterShorthand = (filter: { [key: string]: boolean }, key: string) => {
                        const filterAsKeys = Object.keys(filter)

                        if (filterAsKeys.length === 0) return
                        if (filterAsKeys.length === 1) return filterAsKeys[0]

                        return `${key} (${filterAsKeys.length})`
                      }

                      return (
                        [
                          computeFilterShorthand(selectedTracks, 'Track'),
                          computeFilterShorthand(selectedSessionTypes, 'Session Type'),
                          computeFilterShorthand(selectedExpertise, 'Expertise'),
                          computeFilterShorthand(selectedRooms, 'Room'),
                        ]
                          .filter(val => !!val)
                          .join(', ') || 'No filter applied'
                      )
                    })()}
                  </p>
                </div>
                {/* <div className={filterCss['end']}>
                  <button
                    onClick={() => setView('list')}
                    className={`${view === 'list' ? 'hover' : ''} app squared sm thin-borders`}
                  >
                    <ListIcon />
                  </button>
                  <button
                    onClick={() => setView('timeline')}
                    className={`${view === 'timeline' ? 'hover' : ''} app squared sm thin-borders`}
                  >
                    <TileIcon />
                  </button>
                </div> */}
              </div>
            </div>

            <div className={css['date-selector-container']}>
              <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
                <ul className={css['date-selector']}>
                  {[
                    { text: 'All', value: { readable: 'all', moment: null } },
                    ...eventDates.map((date: any) => {
                      return {
                        text: date.readable,
                        value: date,
                        moment: date.moment,
                      }
                    }),
                  ].map(filter => {
                    let className = ''

                    const selected = dateFilter.readable === filter.value.readable
                    const isCurrentDay = filter.value.moment && filter.value.moment.isSame(now, 'day')

                    if (selected) className += css['selected']
                    if (isCurrentDay) className += ` ${css['is-current-day']}`

                    // TODO: clear up this stuff
                    if (filter.value.readable === 'Invalid date') return null

                    return (
                      <li className={className} key={filter.value.readable} onClick={() => setDateFilter(filter.value)}>
                        {filter.text}
                      </li>
                    )
                  })}
                </ul>
              </SwipeToScroll>
            </div>
          </div>
        </div>
      )}

      <div className="section" style={{ position: 'relative' }}>
        {(() => {
          if (noResults) return <NoResults />

          return view === 'list' ? (
            <List
              now={now}
              sessionTimeslots={sessionTimeslots}
              timeslotOrder={timeslotOrder}
              sessionsByTime={sessionsByTime}
              ref={listRef}
            />
          ) : (
            <p>Timeline view goes here</p>
          )
        })()}
      </div>
    </>
  )
}
