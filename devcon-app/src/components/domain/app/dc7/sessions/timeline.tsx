import React, { useMemo } from 'react'
import { Session as SessionType } from 'types/Session'
import { Event } from 'types/Event'
import moment from 'moment'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import { SessionCard } from './index'

const RoomGrid = ({ rooms }: { rooms: string[] }) => {
  return (
    <div
      className="flex flex-col shrink-0 z-[5]"
      style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(80px, 1fr))` }}
    >
      <div className="p-2 h-[40px] flex justify-center items-center !bg-[#F5F7FA] border border-gray-100 border-solid">
        Nov 12
      </div>
      {rooms.map((room, index) => (
        <div
          key={index}
          className="bg-white p-2 text-center text-xs whitespace-nowrap h-[50px] flex items-center justify-center border border-solid border-gray-100"
        >
          {room}
        </div>
      ))}
    </div>
  )
}

const DayGrid = ({ rooms, sessionsByRoom, timeSlots }: { rooms: string[]; sessionsByRoom: any; timeSlots: any[] }) => {
  //   const rooms = ['Room 1', 'Room 2']

  const processedSessions = sessionsByRoom

  /*
                const currentSession = processedSessions[0]

                const isBeforeEndOfSession = moment.utc(currentSession.slot_end).isAfter(timeslot)

                if (!isBeforeEndOfSession) {
                  return null
                }

                let slotsToFill = 0

                currentTimeslot = currentTimeslot.clone().add(10, 'minutes')

                // processedSessions.shift()

                //   if (!currentSlot) return <div key={slotIndex} className="bg-white p-2 border border-gray-100 border-solid h-[50px]">
  */

  return (
    <div className="flex flex-nowrap shrink-0">
      <div
        className="grid sticky top-0"
        style={{ gridTemplateColumns: `repeat(${timeSlots.length}, minmax(80px, 1fr))` }}
      >
        {timeSlots.map((time, index) => (
          <div
            key={index}
            data-id={time.format('h:mm')}
            className="#F5F7FA py-2 text-sm whitespace-nowrap flex items-center h-[40px] border border-gray-200 border-t-solid !bg-[#F5F7FA]"
          >
            <div style={{ transform: index > 0 ? 'translateX(-50%)' : 'translateX(0)' }}>{time.format('h:mm A')}</div>
          </div>
        ))}

        {rooms.map((room, roomIndex) => {
          const sessions = processedSessions[room]

          console.log(sessions, 'sessions in room', room)

          const sessionByTimeslotStart: Record<
            string,
            { session: SessionType; columns: number; columnIndent: number }
          > = {}

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

          //   console.log(sessionByTimeslotStart, 'sessionByTimeslotStart')

          return (
            <React.Fragment key={roomIndex}>
              {timeSlots.map((timeslot, slotIndex) => {
                const match = sessionByTimeslotStart[timeslot.format('h:mm A')]

                if (!match)
                  //  || room !== 'Main Stage')
                  return <div key={slotIndex} className="bg-white border border-gray-100 border-solid h-[50px]"></div>

                return (
                  <div
                    key={slotIndex}
                    className={`bg-white border border-gray-100 border-solid h-[50px] max-w-[100px]`}
                    // style={{ gridColumn: `span ${match.columns}` }}
                  >
                    <div
                      className={`relative hover:z-[1] min-h-full `}
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
  )
}

const Timeline = ({ sessions, event }: { sessions: SessionType[]; event: Event }) => {
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

  // DAY IS IMPLICIT (CHOSEN FROM THE OUTSIDE VIA FILTER)
  const sessionsByRoom: any = {}

  const firstTimeSlot = moment.utc(sessions[0].slot_start).add(7, 'hours')
  const lastTimeSlot = moment.utc(sessions[sessions.length - 1].slot_start).add(7, 'hours')

  sessions.forEach((session: any) => {
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

    const endTime = moment.utc(lastTimeSlot).add(10, 'minutes') // Add buffer hour after last session + 7 for bangkok

    while (startTime <= endTime) {
      slots.push(startTime.clone())
      startTime.add(10, 'minutes')
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  const rooms = Object.keys(sessionsByRoom).sort((a, b) => {
    if (a === 'Main Stage') return -1
    if (b === 'Main Stage') return 1
    return a.localeCompare(b)
  })

  //   console.log(rooms, 'rooms')
  //   console.log(sessions[0])

  //   console.log(sessionsByDay, 'sessionsByDay')

  return (
    <div className="flex flex-nowrap overflow-hidden">
      <RoomGrid rooms={rooms} />
      <SwipeToScroll noScrollReset>
        <div className="flex flex-nowrap">
          {/* {days.map(day => ( */}
          <DayGrid rooms={rooms} sessionsByRoom={sessionsByRoom} timeSlots={timeSlots} />
          {/* ))} */}
        </div>
      </SwipeToScroll>
    </div>
  )
}

export default Timeline
