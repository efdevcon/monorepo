import React, { useMemo } from 'react'
import { Session as SessionType } from 'types/Session'
import { Event } from 'types/Event'
import moment from 'moment'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import { SessionCard, getTrackLogo } from './index'
import { useRecoilState } from 'recoil'
import { sessionFilterAtom } from 'pages/_app'

const RoomGrid = ({ rooms }: { rooms: string[] }) => {
  const [sessionFilter] = useRecoilState(sessionFilterAtom)

  return (
    <div
      className="flex flex-col shrink-0 z-[5] left-0 absolute lg:relative"
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
            <>
              Decompression<br></br>Room
            </>
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
  return (
    <div className="flex flex-nowrap shrink-0 relative left-[100px] lg:left-0">
      <div
        data-type="day"
        className="absolute left-0 top-0 w-full h-[40px] z-[10] flex items-center translate-x-[-100px]"
      >
        <div className="sticky left-0 !bg-[#F5F7FA] h-full inline-flex items-center text-sm font-semibold w-[100px] justify-center">
          {day}
        </div>
      </div>
      <div className="flex flex-col relative">
        <div
          className="grid shrink-0 sticky top-0"
          style={{ gridTemplateColumns: `repeat(${timeSlots.length}, minmax(80px, 1fr))` }}
        >
          {timeSlots.map((time, index) => (
            <div
              key={index}
              data-id={time.format('h:mm')}
              className="#F5F7FA py-2 text-sm whitespace-nowrap flex items-center h-[40px] border border-gray-200 border-t-solid !bg-[#F5F7FA]"
            >
              <div
                style={{ transform: index > 0 ? 'translateX(-50%)' : 'translateX(0)' }}
                className="flex flex-col justify-center items-center"
              >
                <p>{time.format('h:mm A')}</p>
                <p className="text-[8px] leading-[6px] text-gray-500">Nov 12</p>
              </div>
            </div>
          ))}
        </div>
        <div
          className="grid relative shrink-0"
          style={{ gridTemplateColumns: `repeat(${timeSlots.length}, minmax(80px, 1fr))` }}
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
                  columnIndent: excessMinutes === 5 ? 0.5 : 0,
                }
              })
            }

            return (
              <React.Fragment key={roomIndex}>
                {timeSlots.map((timeslot, slotIndex) => {
                  const match = sessionByTimeslotStart[timeslot.format('h:mm A')]

                  if (!match)
                    //  || room !== 'Main Stage')
                    return <div key={slotIndex} className="bg-white border border-gray-100 border-solid h-[40px]"></div>

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
                        <SessionCard session={match.session} tiny />
                      </div>
                    </div>
                  )
                })}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const Timeline = ({ sessions, event, days }: { sessions: SessionType[]; event: Event; days: string[] }) => {
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

  const rooms = Array.from(new Set(sessions.map(session => session.slot_room?.name))).sort((a: any, b: any) => {
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
  }) as string[]

  return (
    <div className="flex flex-nowrap overflow-hidden">
      <RoomGrid rooms={rooms} />
      <SwipeToScroll noScrollReset>
        <div className="flex flex-nowrap gap-[120px]">
          {days.map(day => {
            const sessionsForDay = sessions.filter(session => moment(session.slot_start).format('MMM DD') === day)

            if (!sessionsForDay.length) return null

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

            return <DayGrid day={day} rooms={rooms} key={day} sessionsByRoom={sessionsByRoom} timeSlots={timeSlots} />
          })}
        </div>
      </SwipeToScroll>
    </div>
  )
}

export default Timeline
