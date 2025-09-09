import React, { useEffect, useState } from "react";
import moment from "moment";
// import NewSchedule from './calendar'
import Event from "./event/event";
import { computeCalendarRange } from "./calendar.utils";
import SwipeToScroll from "lib/components/event-schedule/swipe-to-scroll";
import { Event as EventType } from "./model";
import { format, parseISO } from "date-fns";
// import { useCalendarStore } from 'store/calendar'
import cn from "classnames";
import Timeline from "./timeline";
import NoEventsImage from "./images/404.png";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import DevconnectCubeLogo from "./images/cube-logo.png";
import { eventShops } from "./zupass/event-shops-list";

export type ScheduleProps = {
  isCommunityCalendar?: boolean;
  selectedEvent: EventType | null;
  selectedDay: string | null;
  setSelectedEvent: (event: EventType | null) => void;
  setSelectedDay: (day: string | null) => void;
  events: EventType[];
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
    // if (a.isFairEvent && !b.isFairEvent) return 1;
    // if (!a.isFairEvent && b.isFairEvent) return -1;
    // if (a.isCoreEvent && !b.isCoreEvent) return 1;
    // if (!a.isCoreEvent && b.isCoreEvent) return -1;

    const day1 = moment(a.timeblocks[0].start).dayOfYear();
    const day2 = moment(b.timeblocks[0].start).dayOfYear();

    const isSameDay = day1 === day2;

    if (isSameDay) {
      return (
        moment(b.timeblocks[b.timeblocks.length - 1].end).valueOf() -
        moment(a.timeblocks[a.timeblocks.length - 1].end).valueOf()
      );
    }

    return day1 - day2;
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
        rowSpan: event.spanRows ? event.spanRows : 1,
        column: startColIndex + 1, // +1 because CSS grid is 1-indexed
        duration,
      },
      // Store all dates this event covers for hover highlighting
      datesCovered: dateColumns.slice(startColIndex, startColIndex + duration),
    });

    // Add additional rows for special events
    if (event.spanRows) {
      for (let i = 0; i < event.spanRows; i++) {
        !placementTracker.placeItem(row + i, startColIndex + 1, duration);
      }
      row += event.spanRows - 1;
    }
  });

  return eventPlacements;
};

const NewScheduleIndex = ({
  selectedEvent,
  selectedDay,
  setSelectedEvent,
  setSelectedDay,
  events,
}: ScheduleProps) => {
  const searchParams = useSearchParams();
  // const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } = useCalendarStore()
  const eventRange = computeCalendarRange(events);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Compute event placements for the unified grid
  const eventPlacements = computeEventPlacements(events, eventRange);

  // Format date for display
  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    return {
      day: format(date, "EEE"),
      date: format(date, "MMM d"),
    };
  };

  // Define shared column template for consistent alignment
  // const columnTemplate = `repeat(${eventRange.length}, minmax(175px, 1fr))`
  const columnTemplate = `repeat(${eventRange.length}, minmax(auto, 230px))`;

  // Check if an event should be highlighted based on hovered date
  const isEventHighlighted = (placement: any) => {
    if (!hoveredDate) return false;

    // Check if any of the dates covered by this event match the hovered date
    return placement.datesCovered.includes(hoveredDate);
  };

  // Check if date is within November 17-22 range
  const isDateInDevconnectRange = (dateStr: string) => {
    const date = parseISO(dateStr);
    const month = date.getMonth(); // 0-indexed (November = 10)
    const day = date.getDate();

    return month === 10 && day >= 17 && day <= 22; // November (10) 17-22
  };

  // Can consider moving this into the schedule component
  useEffect(() => {
    const eventParam = searchParams.get("event");

    if (eventParam && events.length > 0) {
      // custom zupass gated event id for cleaner urls
      const customUrlIdEvent = events.find((event) => {
        return eventShops.some((shop) => {
          if (
            shop.custom_url_id &&
            shop.custom_url_id === eventParam &&
            event.id.toString() === shop.supabase_id
          ) {
            return true;
          }
          return false;
        });
      });

      if (customUrlIdEvent) {
        setSelectedEvent(customUrlIdEvent);
        return;
      }

      // Try to find event by id or name (converted to slug format)
      const targetEvent = events.find(
        (event) =>
          event.id.toString() === eventParam.toString() ||
          (event.rkey && event.rkey.toString() === eventParam.toLowerCase())
      );

      if (targetEvent) {
        setSelectedEvent(targetEvent);
        return;
      }
    }
  }, [searchParams.get("event")]);

  // <div className="flex flex-col gap-4 w-full">
  return (
    <>
      <SwipeToScroll noBounds>
        <div className="text-black flex">
          {/* padding hack for mobile */}
          <div className="hidden touch-only:block w-4 md:w-0 h-[1px]"></div>
          <div className="w-full flex">
            <div
              className="grid shrink-0"
              style={{
                gridTemplateColumns: columnTemplate,
                gridTemplateRows: "auto 1fr",
              }}
            >
              {/* Header row with dates */}
              <div className="contents relative">
                {eventRange.map((date) => (
                  <div
                    key={date}
                    className={cn(
                      "text-sm cursorr-pointer flex items-center justify-between hoverr:bg-gray-100 font-semibold py-2 px-3 mx-0.5 lg:sticky lg:top-[4px] bg-white z-50 border border-solid border-neutral-300 transiation-all duration-300 mb-0.5",
                      selectedDay === date && "!bg-slate-100 !opacity-100",
                      selectedDay !== null && "opacity-20"
                    )}
                    // onMouseEnter={() => setHoveredDate(date)}
                    // onMouseLeave={() => setHoveredDate(null)}
                    // onClick={() => {
                    //   if (selectedDay !== date) {
                    //     setSelectedDay(date);
                    //   } else {
                    //     setSelectedDay(null);
                    //   }
                    // }}
                  >
                    <div className="text-center flex items-center justify-between w-full grow">
                      <div className="flex gap-2 items-center justify-center h-full">
                        {isDateInDevconnectRange(date) && (
                          <Image
                            src={DevconnectCubeLogo}
                            alt="Devconnect Cube"
                            className="w-[26px] object-contain"
                          />
                        )}
                        {formatDateHeader(date).day}{" "}
                      </div>
                      <div className="">{formatDateHeader(date).date}</div>
                    </div>
                  </div>
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

              <div className={cn("contents", selectedDay && "hidden")}>
                {eventPlacements.map((placement, idx) => (
                  <div
                    key={`event-${placement.event.id}-${idx}`}
                    style={{
                      gridRow: `${placement.gridPosition.row + 1} / span ${
                        placement.gridPosition.rowSpan
                      }`,
                      gridColumn: `${placement.gridPosition.column} / span ${placement.gridPosition.duration}`,
                    }}
                    className={`bg-white rounded-lg border m-0.5 mt-0 relative transition-all duration-200]`}
                  >
                    <Event
                      event={placement.event}
                      duration={placement.gridPosition.duration}
                      className={
                        isEventHighlighted(placement)
                          ? "!border-neutral-500"
                          : ""
                      }
                      selectedEvent={selectedEvent}
                      setSelectedEvent={setSelectedEvent}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="w-4 md:w-0 h-[1px] shrink-0"></div>
          </div>
        </div>
      </SwipeToScroll>
      {eventPlacements.length === 0 && (
        <div
          className="text-gray-400 py-3 text-center flex flex-col justify-center items-center"
          style={{ gridColumn: `1 / -1` }}
        >
          <Image
            src={NoEventsImage}
            alt="No events scheduled"
            className="h-full object-contain w-[500px] max-w-[calc(100%-32px)] mx-4 my-4 mt-2"
          />
          <div className="text-gray-400 py-3 text-center flex justify-center items-center">
            {events.length === 0 && "No events match this filter"}
          </div>
        </div>
      )}
    </>
  );

  /* 
     <div
        className="left-0 z-[9] top-[100%] mt-2 w-full"
        style={{
          gridColumn: `1 / span ${eventRange.length}`, // Span all columns
        }}
      >
        <Timeline events={events} /> 
        {selectedDay && <MapComponent />} 
      </div>
    </div>  */
};

export default NewScheduleIndex;
