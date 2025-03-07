import React, { useState } from 'react'
// import NewSchedule from './calendar'
import Event from './day/event'
import { dummyEvents } from './dummy-data'
import { computeCalendarRange } from './calendar.utils'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import { Event as EventType } from './model'
import { format, parseISO } from 'date-fns'

// Utility function for tracking placed nodes in the grid
const createPlacementTracker = () => {
  const occupiedNodes: Record<number, Record<number, boolean>> = {}

  return {
    occupiedNodes,
    placeItem: (row: number, startCol: number, duration: number): boolean => {
      // Check if any cell in the range is already occupied
      for (let i = startCol; i < startCol + duration; i++) {
        if (occupiedNodes[row]?.[i]) {
          return false
        }
      }

      // If all cells are free, mark them as occupied
      for (let i = startCol; i < startCol + duration; i++) {
        if (!occupiedNodes[row]) {
          occupiedNodes[row] = {}
        }
        occupiedNodes[row][i] = true
      }
      return true
    },
  }
}

// Compute event placements in the grid
const computeEventPlacements = (events: EventType[], dateColumns: string[]): any[] => {
  const placementTracker = createPlacementTracker()
  const eventPlacements: any[] = []

  // Group timeblocks by event ID first to consolidate them
  events.forEach(event => {
    // Find earliest start date and latest end date across all timeblocks
    let earliestStartDate = ''
    let latestEndDate = ''
    let earliestTimeblock = null

    event.timeblocks.forEach(timeblock => {
      const startDate = timeblock.start.split('T')[0]
      const endDate = timeblock.end.split('T')[0]

      if (!earliestStartDate || startDate < earliestStartDate) {
        earliestStartDate = startDate
        earliestTimeblock = timeblock
      }

      if (!latestEndDate || endDate > latestEndDate) {
        latestEndDate = endDate
      }
    })

    // Skip if no valid timeblocks
    if (!earliestStartDate || !earliestTimeblock) return

    // Calculate event position once per event using the combined date range
    const startColIndex = dateColumns.indexOf(earliestStartDate)
    const endColIndex = dateColumns.indexOf(latestEndDate)

    // Skip if start date isn't in our range
    if (startColIndex === -1) return

    // Duration is the number of days (columns) the event spans
    const duration = endColIndex === -1 ? 1 : endColIndex - startColIndex + 1

    // Find first available row for this event
    let row = 1
    while (!placementTracker.placeItem(row, startColIndex + 1, duration)) {
      row++
    }

    // Store event with its grid position
    eventPlacements.push({
      event,
      timeblock: earliestTimeblock, // Use earliest timeblock for time display
      gridPosition: {
        row,
        column: startColIndex + 1, // +1 because CSS grid is 1-indexed
        duration,
      },
    })
  })

  return eventPlacements
}

const NewScheduleIndex = () => {
  const eventRange = computeCalendarRange(dummyEvents)
  const [events] = useState<EventType[]>(dummyEvents)

  // Compute event placements for the unified grid
  const eventPlacements = computeEventPlacements(events, eventRange)

  // Format date for display
  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr)
    return format(date, 'EEE, MMM d')
  }

  // Define shared column template for consistent alignment
  const columnTemplate = `repeat(${eventRange.length}, minmax(175px, 1fr))`

  return (
    <SwipeToScroll>
      <div className="text-black p-4">
        {/* Unified Calendar Grid with aligned header and content */}
        <div className="w-full">
          {/* Grid container with header and content in one cohesive grid */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: columnTemplate,
              gridTemplateRows: 'auto 1fr',
            }}
          >
            {/* Header row with dates */}
            <div className="contents">
              {eventRange.map(date => (
                <h2 key={date} className="text-sm font-semibold py-2 px-3 sticky top-0 bg-white z-10 border-b">
                  {formatDateHeader(date)}
                </h2>
              ))}
            </div>

            {/* Calendar body */}
            <div className="contents">
              {/* Place all events in the grid */}
              {eventPlacements.map((placement, idx) => (
                <div
                  key={`event-${placement.event.id}-${idx}`}
                  style={{
                    gridRow: `${placement.gridPosition.row + 1} / span ${
                      placement.event.name.includes('ETH Day') ? 3 : 1
                    }`, // Make ETH Day events span 3 rows
                    gridColumn: `${placement.gridPosition.column} / span ${placement.gridPosition.duration}`,
                  }}
                  className={`bg-white rounded-lg border border-blue-200 m-0.5 mt-0 relative`}
                >
                  <Event
                    event={placement.event}
                    duration={placement.gridPosition.duration}
                    // isCoworking={placement.event.name.includes('Coworking')}
                    // isMultiDay={placement.gridPosition.duration > 1}
                    // timeblock={placement.timeblock}
                  />
                </div>
              ))}

              {/* If no events are scheduled, show message */}
              {eventPlacements.length === 0 && (
                <div className="text-gray-400 py-3 text-center" style={{ gridColumn: `1 / span ${eventRange.length}` }}>
                  No events scheduled
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SwipeToScroll>
  )
}

export default NewScheduleIndex
