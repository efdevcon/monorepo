import React, { useMemo, useRef, useState, useEffect } from 'react'
import { Session as SessionType } from 'types/Session'
import { Event } from 'types/Event'
import moment, { now } from 'moment'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import { SessionCard, getTrackLogo } from './index'
import { useRecoilState } from 'recoil'
import { sessionFilterAtom } from 'pages/_app'
import useDimensions from 'react-cool-dimensions'
import { cn } from 'lib/shadcn/lib/utils'
import { useAppContext } from 'context/app-context'

const RoomGrid = ({ rooms }: { rooms: string[] }) => {
  const [sessionFilter] = useRecoilState(sessionFilterAtom)
  const [isNativeScroll, setIsNativeScroll] = useState(false)
  // When element changes size, record its max scroll boundary and reset all scroll related state to avoid edge cases
  // const { observe } = useDimensions({
  //   onResize: ({ width }) => {

  //     setIsNativeScroll(isNativeScroll)
  //   },
  // })

  useEffect(() => {
    const isNativeScroll = !window.matchMedia('not all and (hover: none)').matches

    setIsNativeScroll(isNativeScroll)
  }, [isNativeScroll])

  return (
    <div
      className={cn('flex flex-col shrink-0 z-[5] left-0', isNativeScroll ? 'absolute' : 'relative')}
      style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(80px, 1fr))` }}
    >
      <div className="p-2 h-[40px] flex justify-center items-center bg-[#F5F7FA] !bg-transparent borderz border-gray-100 border-solid">
        <div></div>
      </div>

      {rooms.map((room, index) => (
        <div
          key={index}
          className="bg-white p-2 text-xs text-center whitespace-nowrap h-[40px] w-[100px] flex items-center justify-center border border-solid border-gray-100 glass"
        >
          {room === 'Decompression Room' ? (
            <>Decompression</>
          ) : room === 'Artists Cohort Pyramid' ? (
            <>Artists Pyramid</>
          ) : (
            room
          )}
        </div>
      ))}
    </div>
  )
}

const DayGrid = ({
  rooms,
  sessionsByRoom,
  timeSlots,
  day,
}: {
  rooms: string[]
  sessionsByRoom: any
  timeSlots: any[]
  day: string
}) => {
  const { now } = useAppContext()
  const scrollSyncRef = useRef<HTMLDivElement>(null)
  const [isNativeScroll, setIsNativeScroll] = useState(false)
  // When element changes size, record its max scroll boundary and reset all scroll related state to avoid edge cases
  const { observe } = useDimensions({
    onResize: ({ width }) => {
      const isNativeScroll = !window.matchMedia('not all and (hover: none)').matches

      setIsNativeScroll(isNativeScroll)
    },
  })

  return (
    <div className={cn('flex shrink-0 w-full relative', isNativeScroll ? 'left-[0px]' : 'left-[0px]')}>
      {/* <div
        data-type="day"
        className="absolute left-0 top-0 w-full h-[40px] z-[10] flex items-center translate-x-[-100px]"
      >
        <div className="sticky left-0 !bg-[#F5F7FA] h-full inline-flex items-center text-sm font-semibold w-[100px] justify-center">
          {day}
        </div>
      </div> */}
      <div className="flex flex-col">
        <div
          className={cn(
            'grid shrink-0 sticky top-[100px] lg:top-[106px] z-[6] !border-none pointer-events-none',
            isNativeScroll ? '!overflow-x-auto !translate-x-0' : 'glass'
          )}
          style={{
            gridTemplateColumns: `repeat(${timeSlots.length}, minmax(100px, 1fr))`,
          }}
          // onScroll={(e: any) => {
          //   console.log('scroll', e.target.scrollLeft)
          //   e.preventDefault()
          //   e.stopPropagation()
          // }}
          ref={element => {
            // @ts-ignore
            scrollSyncRef.current = element!
            observe(element)
          }}
        >
          <div
            data-type="day"
            className={cn(
              'absolute left-0 top-0 w-[100px] h-[40px] flex items-center',
              isNativeScroll ? 'translate-x-[0px]' : 'translate-x-[-100px]',
              'border-bottom border-top z-[1]'
            )}
          >
            <div className="sticky left-0 !bg-[#F5F7FA] h-full inline-flex items-center text-sm font-semibold w-[100px] justify-center">
              {day}
            </div>
          </div>
          {timeSlots.map((time, index) => {
            const isCurrent =
              moment.utc(time).isSameOrBefore(now, 'minutes') &&
              moment.utc(time).add(10, 'minutes').isAfter(now, 'minutes')

            let offset = 0

            if (isCurrent) {
              const minutesElapsed = moment.utc(now).diff(moment.utc(time), 'minutes')
              offset = (minutesElapsed / 10) * 100
            }

            return (
              <div
                key={index}
                data-id={time.format('h:mm')}
                className={cn(
                  'py-2 text-sm whitespace-nowrap relative flex items-center w-[100px] h-[40px] border-top !bg-[#F5F7FA] border-bottom'
                )}
                style={{ transform: isNativeScroll ? 'translateX(100px)' : 'translateX(var(--scroll-x))' }}
              >
                {isCurrent && (
                  <div
                    className={cn('absolute left-0 top-0 w-[7px] h-full flex items-end justify-center')}
                    style={{ transform: `translateX(${offset}px)` }}
                  >
                    <div className="absolute left-[-1px] top-0 w-[2px] h-full bg-red-200"></div>
                    {/* <div className="absolute bottom-0 margin-auto bg-red-500 w-[20px] h-[20px] flex justify-center translate-y-full"> */}
                    <div className="bg-red-400 w-[7px] h-[7px] rounded-full flex justify-center translate-y-1/2 -translate-x-1/2"></div>
                  </div>
                )}

                <div
                  style={{ transform: index > 0 ? 'translateX(-50%)' : 'translateX(0)' }}
                  className="flex flex-col justify-center items-center"
                >
                  <p>{time.format('h:mm A')}</p>
                  <p className="text-[8px] leading-[6px] text-gray-500">{time.format('MMM DD')}</p>
                </div>
              </div>
            )
          })}
        </div>
        <SwipeToScroll speed={1.5} noScrollReset syncElement={scrollSyncRef}>
          <div className={cn('flex', isNativeScroll ? '' : '')}>
            <div
              className={cn('grid relative shrink-0', isNativeScroll ? 'translate-x-[100px]' : '')}
              style={{ gridTemplateColumns: `repeat(${timeSlots.length}, minmax(100px, 1fr))` }}
            >
              {rooms.map((room, roomIndex) => {
                const sessions = sessionsByRoom[room]

                const sessionByTimeslotStart: Record<
                  string,
                  { session: SessionType; columns: number; columnIndent: number }
                > = {}

                if (sessions) {
                  sessions.forEach((session: SessionType) => {
                    const start = moment.utc(session.slot_start).add(7, 'hours')
                    const end = moment.utc(session.slot_end).add(7, 'hours')
                    const durationInMinutes = end.diff(start, 'minutes')
                    // const columns = Math.ceil(durationInMinutes / 10) // Since timeslots are 10 minutes each
                    const columns = durationInMinutes / 10

                    const excessMinutes = start.minute() % 10

                    const nearestTen = start.clone().subtract(excessMinutes, 'minutes')

                    const startFormatted = nearestTen.format('h:mm A')

                    sessionByTimeslotStart[startFormatted] = {
                      session,
                      columns,
                      columnIndent: excessMinutes * 0.1,
                    }
                  })
                }

                return (
                  <React.Fragment key={roomIndex}>
                    {timeSlots.map((timeslot, slotIndex) => {
                      const match = sessionByTimeslotStart[timeslot.format('h:mm A')]

                      if (!match)
                        //  || room !== 'Main Stage')
                        return (
                          <div key={slotIndex} className="bg-white border border-gray-100 border-solid h-[40px]"></div>
                        )

                      return (
                        <div
                          key={slotIndex}
                          className={`bg-white border border-gray-100 border-solid h-[40px] relative max-w-[100px]`}
                          // style={{ gridColumn: `span ${match.columns}` }}
                        >
                          <div
                            className={``}
                            style={{ width: `${match.columns * 100}px`, marginLeft: `${match.columnIndent * 100}px` }}
                          >
                            <SessionCard session={match.session} tiny className="z-[1] hover:z-[2]" />
                          </div>
                        </div>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </SwipeToScroll>
      </div>
    </div>
  )
}

const Timeline = ({ sessions, event, days }: { sessions: SessionType[]; event: Event; days: string[] }) => {
  const { now } = useAppContext()
  // console.log(days, 'days')

  //   const { rooms, days, sessionsByDay } = useMemo(() => {
  //     // Get unique rooms from all sessions
  //     const uniqueRooms = Array.from(new Set(sessions.map(session => session.slot_room?.name))).sort()

  //     // Get unique days from all sessions
  //     const uniqueDays = Array.from(new Set(sessions.map(session => moment(session.slot_start).format('MMM DD')))).sort()

  //     // Group sessions by day
  //     const sessionsByDay = uniqueDays.reduce((acc, day) => {
  //       acc[day] = sessions.filter(session => moment(session.slot_start).format('MMM DD') === day)
  //       return acc
  //     }, {} as Record<string, SessionType[]>)

  //     return {
  //       rooms: uniqueRooms,
  //       days: uniqueDays,
  //       sessionsByDay,
  //     }
  //   }, [sessions, event])

  if (!sessions.length) return null

  return (
    <div className="flex flex-col gap-[36px]" style={{ contain: 'paint' }}>
      {days.map(day => {
        const sessionsForDay = sessions.filter(
          session => moment.utc(session.slot_start).add(7, 'hours').format('MMM DD') === day
        )

        if (!sessionsForDay.length) return null

        const rooms = Array.from(new Set(sessionsForDay.map(session => session.slot_room?.name))).sort(
          (a: any, b: any) => {
            if (a === 'Main Stage') return -1
            if (b === 'Main Stage') return 1

            if (a.toLowerCase().startsWith('stage')) {
              if (b.toLowerCase().startsWith('stage')) {
                return a.localeCompare(b)
              }
              return -1
            }

            if (b.toLowerCase().startsWith('stage')) return 1

            return a.localeCompare(b)
          }
        ) as string[]

        const sessionsByRoom: any = {}

        const firstTimeSlot = moment.utc(sessionsForDay[0].slot_start).add(7, 'hours')
        const lastTimeSlot = moment.utc(sessionsForDay[sessionsForDay.length - 1].slot_end).add(7, 'hours')

        sessionsForDay.forEach((session: any) => {
          if (sessionsByRoom[session.slot_room?.name]) {
            sessionsByRoom[session.slot_room?.name].push(session)
          } else {
            sessionsByRoom[session.slot_room?.name] = [session]
          }
        })

        const generateTimeSlots = () => {
          const slots = []
          const startTime = moment.utc(firstTimeSlot)
          startTime.subtract(startTime.minute() % 10, 'minutes')

          const endTime = moment.utc(lastTimeSlot).add(10, 'minutes') // Add buffer after last session + 7 for bangkok

          while (startTime <= endTime) {
            slots.push(startTime.clone())
            startTime.add(10, 'minutes')
          }
          return slots
        }

        const timeSlots = generateTimeSlots()

        const findNearestTimeslot = (time: string) => {
          if (!time) return null
          const timeMoment = moment.utc(time).add(7, 'hours')

          // Only proceed if the time is for the current day
          if (timeMoment.format('MMM DD') !== day) return null

          return timeSlots.reduce((nearest: any, slot: any) => {
            if (!nearest) return slot
            const currentDiff = Math.abs(timeMoment.diff(slot))
            const nearestDiff = Math.abs(timeMoment.diff(nearest))
            return currentDiff < nearestDiff ? slot : nearest
          }, null)
        }

        console.log(
          moment.utc(findNearestTimeslot(now?.format('h:mm A') || '')).format('h:mm A'),
          'findNearestTimeslot'
        )

        return (
          <div key={day} className="flex relative">
            <RoomGrid rooms={rooms} />
            <DayGrid day={day} rooms={rooms} sessionsByRoom={sessionsByRoom} timeSlots={timeSlots} />
          </div>
        )
      })}
    </div>
  )
}

export default Timeline
