import React, { useState } from "react";
// import NewSchedule from './calendar'
import Event from "./day/event";
import { dummyEvents } from "./dummy-data";
import { computeCalendarRange } from "./calendar.utils";
import SwipeToScroll from "lib/components/event-schedule/swipe-to-scroll";
import { Event as EventType } from "./model";
import { format, parseISO } from "date-fns";
// import { useCalendarStore } from 'store/calendar'
import cn from "classnames";
import Timeline from "./timeline";
// import MapComponent from './map'
import { Button } from "lib/components/button";

type ScheduleProps = {
  selectedEvent: EventType | null;
  selectedDay: string | null;
  setSelectedEvent: (event: EventType | null) => void;
  setSelectedDay: (day: string | null) => void;
};

// Utility function for tracking placed nodes in the grid
const createPlacementTracker = () => {
  const occupiedNodes: Record<number, Record<number, boolean>> = {};

  return {
    occupiedNodes,
    placeItem: (row: number, startCol: number, duration: number): boolean => {
      // Check if any cell in the range is already occupied
      for (let i = startCol; i < startCol + duration; i++) {
        if (occupiedNodes[row]?.[i]) {
          return false;
        }
      }

      // If all cells are free, mark them as occupied
      for (let i = startCol; i < startCol + duration; i++) {
        if (!occupiedNodes[row]) {
          occupiedNodes[row] = {};
        }
        occupiedNodes[row][i] = true;
      }
      return true;
    },
  };
};

// Compute event placements in the grid
const computeEventPlacements = (
  events: EventType[],
  dateColumns: string[]
): any[] => {
  const placementTracker = createPlacementTracker();

  // Sort events to prioritize isFairEvent and isCoreEvent
  const sortedEvents = [...events].sort((a, b) => {
    if (a.isFairEvent && !b.isFairEvent) return -1;
    if (!a.isFairEvent && b.isFairEvent) return 1;
    if (a.isCoreEvent && !b.isCoreEvent) return -1;
    if (!a.isCoreEvent && b.isCoreEvent) return 1;
    return 0;
  });

  const eventPlacements: any[] = [];

  // Process events in their sorted order
  sortedEvents.forEach((event) => {
    // Find earliest start date and latest end date across all timeblocks
    let earliestStartDate = "";
    let latestEndDate = "";
    let earliestTimeblock = null;

    event.timeblocks.forEach((timeblock) => {
      const startDate = timeblock.start.split("T")[0];
      const endDate = timeblock.end.split("T")[0];

      if (!earliestStartDate || startDate < earliestStartDate) {
        earliestStartDate = startDate;
        earliestTimeblock = timeblock;
      }

      if (!latestEndDate || endDate > latestEndDate) {
        latestEndDate = endDate;
      }
    });

    // Skip if no valid timeblocks
    if (!earliestStartDate || !earliestTimeblock) return;

    // Calculate event position once per event using the combined date range
    const startColIndex = dateColumns.indexOf(earliestStartDate);
    const endColIndex = dateColumns.indexOf(latestEndDate);

    // Skip if start date isn't in our range
    if (startColIndex === -1) return;

    // Duration is the number of days (columns) the event spans
    const duration = endColIndex === -1 ? 1 : endColIndex - startColIndex + 1;

    // Find first available row for this event
    let row = 1;
    while (!placementTracker.placeItem(row, startColIndex + 1, duration)) {
      row++;
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
      // Store all dates this event covers for hover highlighting
      datesCovered: dateColumns.slice(startColIndex, startColIndex + duration),
    });
  });

  return eventPlacements;
};

const NewScheduleIndex = ({
  selectedEvent,
  selectedDay,
  setSelectedEvent,
  setSelectedDay,
}: ScheduleProps) => {
  // const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } = useCalendarStore()
  const eventRange = computeCalendarRange(dummyEvents);
  const [events] = useState<EventType[]>(dummyEvents);
  // Add state to track which date is being hovered
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Compute event placements for the unified grid
  const eventPlacements = computeEventPlacements(events, eventRange);

  // Format date for display
  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, "EEE, MMM d");
  };

  // Define shared column template for consistent alignment
  // const columnTemplate = `repeat(${eventRange.length}, minmax(175px, 1fr))`
  const columnTemplate = `repeat(${eventRange.length}, minmax(115px, 1fr))`;

  // Check if an event should be highlighted based on hovered date
  const isEventHighlighted = (placement: any) => {
    if (!hoveredDate) return false;

    // Check if any of the dates covered by this event match the hovered date
    return placement.datesCovered.includes(hoveredDate);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* <div className="flex justify-between gap-4">
        <div className="text-lg font-bold">Devconnect 2025 Buenos Aires</div>
        <div className="flex gap-2 items-center">
          <div className="text-sm text-gray-500">Filter Goes here</div>
          <Button variant="secondary">Login with Zupass</Button>
        </div>
      </div> */}
      <SwipeToScroll>
        <div className="text-black">
          {/* Unified Calendar Grid with aligned header and content */}
          <div className="w-full">
            {/* Grid container with header and content in one cohesive grid */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: columnTemplate,
                gridTemplateRows: "auto 1fr",
              }}
            >
              {/* Header row with dates */}
              <div className="contents relative">
                {eventRange.map((date) => (
                  <h2
                    key={date}
                    className={cn(
                      "text-sm cursor-pointer hover:bg-gray-100 font-semibold py-2 px-3 stickyy top-0 z-10 border-b cursor-pointer rounded-lg mb-0.5",
                      selectedDay === date && "!bg-slate-100 !opacity-100",
                      selectedDay !== null && "opacity-20"
                    )}
                    onMouseEnter={() => setHoveredDate(date)}
                    onMouseLeave={() => setHoveredDate(null)}
                    onClick={() => {
                      if (selectedDay !== date) {
                        setSelectedDay(date);
                      } else {
                        setSelectedDay(null);
                      }
                    }}
                  >
                    {formatDateHeader(date)}
                  </h2>
                ))}
              </div>

              {/* <div
                className="left-0 z-[9] top-[100%] mt-2"
                style={{
                  gridColumn: `1 / span ${eventRange.length}`, // Span all columns
                }}
              >
                <Timeline events={dummyEvents} />
                {selectedDay && <MapComponent />}
              </div> */}

              {/* Calendar body */}
              <div className={cn("contents", selectedDay && "hidden")}>
                {/* Place all events in the grid */}
                {eventPlacements.map((placement, idx) => (
                  <div
                    key={`event-${placement.event.id}-${idx}`}
                    style={{
                      gridRow: `${placement.gridPosition.row + 1} / span ${
                        placement.event.name.includes("ETH Day") ? 3 : 1
                      }`, // Make ETH Day events span 3 rows
                      gridColumn: `${placement.gridPosition.column} / span ${placement.gridPosition.duration}`,
                    }}
                    className={`bg-white rounded-lg border m-0.5 mt-0 relative transition-all duration-200`}
                  >
                    <Event
                      event={placement.event}
                      duration={placement.gridPosition.duration}
                      className={
                        isEventHighlighted(placement) ? "!border-black" : ""
                      }
                      selectedEvent={selectedEvent}
                      setSelectedEvent={setSelectedEvent}
                      // isCoworking={placement.event.name.includes('Coworking')}
                      // isMultiDay={placement.gridPosition.duration > 1}
                      // timeblock={placement.timeblock}
                    />
                  </div>
                ))}

                {/* If no events are scheduled, show message */}
                {eventPlacements.length === 0 && (
                  <div
                    className="text-gray-400 py-3 text-center"
                    style={{ gridColumn: `1 / span ${eventRange.length}` }}
                  >
                    No events scheduled
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SwipeToScroll>

      <div
        className="left-0 z-[9] top-[100%] mt-2 w-full"
        // style={{
        //   gridColumn: `1 / span ${eventRange.length}`, // Span all columns
        // }}
      >
        <Timeline events={dummyEvents} />
        {/* {selectedDay && <MapComponent />} */}
      </div>
    </div>
  );
};

export default NewScheduleIndex;
