import React, { useState } from 'react'
// import NewSchedule from './calendar'
import Event from './day/event'
import { dummyEvents } from './dummy-data'
import { computeCalendarRange } from './calendar.utils'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import { Event as EventType } from './model'
import { format, parseISO } from 'date-fns'

const NewScheduleIndex = () => {
  const eventRange = computeCalendarRange(dummyEvents)
  const [events] = useState<EventType[]>(dummyEvents)

  // Group events by date
  const eventsByDate: Record<string, EventType[]> = {}

  // Initialize empty arrays for each date in the range
  eventRange.forEach(date => {
    eventsByDate[date] = []
  })

  // Populate events for each date
  events.forEach(event => {
    event.timeblocks.forEach(timeblock => {
      const startDate = timeblock.start.split('T')[0]
      const endDate = timeblock.end.split('T')[0]

      // If it's a single-day event
      if (startDate === endDate) {
        if (eventRange.includes(startDate)) {
          eventsByDate[startDate].push(event)
        }
      } else {
        // For multi-day events, add them to each day they span
        eventRange.forEach(date => {
          if (date >= startDate && date <= endDate) {
            eventsByDate[date].push(event)
          }
        })
      }
    })
  })

  // Format date for display
  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr)
    return format(date, 'EEE, MMM d')
  }

  return (
    <SwipeToScroll>
      <div className="text-black p-4">
        {/* <h1 className="text-2xl font-bold mb-6">Event Schedule</h1> */}

        {/* Calendar Grid */}
        <div className="flex gap-4 pb-4">
          {eventRange.map(date => (
            <div key={date} className="min-w-[300px] flex flex-col">
              <h2 className="text-sm font-semibold py-2 sticky top-0 bg-white">{formatDateHeader(date)}</h2>

              <div className="flex flex-col gap-3">
                {eventsByDate[date].length > 0 ? (
                  eventsByDate[date].map(event => <Event key={`${date}-${event.id}`} event={event} />)
                ) : (
                  <div className="text-gray-400 py-3">No events scheduled</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SwipeToScroll>
  )
}

export default NewScheduleIndex
