import React, { useEffect, useState, Suspense } from "react";
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
import { useIsMobile } from "lib/hooks/useIsMobile";

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
  dateColumns: string[],
  isMobile: boolean
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

    const spanRows = isMobile ? 1 : event.spanRows ? event.spanRows : 1;

    // Store event with its grid position
    eventPlacements.push({
      event,
      timeblock: earliestTimeblock, // Use earliest timeblock for time display
      gridPosition: {
        row,
        rowSpan: spanRows ? spanRows : 1,
        column: startColIndex + 1, // +1 because CSS grid is 1-indexed
        duration,
      },
      // Store all dates this event covers for hover highlighting
      datesCovered: dateColumns.slice(startColIndex, startColIndex + duration),
    });

    // Add additional rows for special events
    if (spanRows > 1) {
      for (let i = 0; i < spanRows; i++) {
        !placementTracker.placeItem(row + i, startColIndex + 1, duration);
      }
      row += spanRows - 1;
    }
  });

  return eventPlacements;
};

const NewScheduleIndexInner = ({
  selectedEvent,
  selectedDay,
  setSelectedEvent,
  setSelectedDay,
  events,
  viewMode,
}: ScheduleProps & { viewMode: "list" | "grid" }) => {
  const searchParams = useSearchParams();
  // const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } = useCalendarStore()
  const eventRange = computeCalendarRange(events);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const isMobile = useIsMobile(768);

  // Compute event placements for the unified grid
  const eventPlacements = computeEventPlacements(events, eventRange, isMobile);

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
  const columnTemplate = `repeat(${eventRange.length}, minmax(auto, 240px))`;

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

  useEffect(() => {
    const ethDayEvent =
      events.find((event) => event.id.toString() === "84") || null;

    if (ethDayEvent) {
      (window as any).selectEthDay = () => {
        setSelectedEvent(ethDayEvent);
      };

      return () => {
        delete (window as any).selectEthDay;
      };
    }
  }, []);

  // Select event from url params
  useEffect(() => {
    let eventParam = searchParams.get("event");
    const transforms = [
      { from: "ethday", to: "84" },
      { from: "DSS", to: "86" },
      { from: "soliditysummit", to: "76" },
    ];

    if (
      eventParam &&
      transforms.some((transform) => transform.from === eventParam)
    ) {
      eventParam =
        transforms.find((transform) => transform.from === eventParam)?.to ||
        null;
    }

    if (eventParam && events.length > 0) {
      // Transform event params to match event ids
      const event = events.find(
        (event) =>
          event.id.toString() === eventParam.toString() ||
          (event.rkey && event.rkey.toString() === eventParam.toLowerCase())
      );

      if (event) {
        setSelectedEvent(event);
        return;
      }
    }
  }, [searchParams.get("event")]);

  const listView = viewMode === "list" && isMobile;

  const selectedEventForDialog =
    eventPlacements.find(
      (placement) => placement.event.id === selectedEvent?.id
    ) || null;

  // State for managing collapsed days
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  return (
    <>
      {selectedEventForDialog && (
        <Event
          event={selectedEventForDialog?.event}
          isDialog={true}
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
        />
      )}

      {listView && (
        <div className="flex flex-col w-full touch-only:px-4">
          {(() => {
            // Group events by the dates they cover
            const eventsByDate = new Map<string, typeof eventPlacements>();

            // Get all unique dates from eventRange or from the events themselves
            const allDates = new Set<string>();
            eventPlacements.forEach((placement) => {
              placement.datesCovered.forEach((date: string) => {
                allDates.add(date);
              });
            });

            // Sort the dates
            const sortedDates = Array.from(allDates).sort();

            // Group events by each date they appear on
            sortedDates.forEach((date) => {
              const eventsOnDate = eventPlacements.filter((placement) =>
                placement.datesCovered.includes(date)
              );
              if (eventsOnDate.length > 0) {
                eventsByDate.set(date, eventsOnDate);
              }
            });

            // Toggle function for collapsing/expanding days
            const toggleDayCollapse = (date: string) => {
              setCollapsedDays((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(date)) {
                  newSet.delete(date);
                } else {
                  newSet.add(date);
                }
                return newSet;
              });
            };

            // Render each date with its events
            const entries = Array.from(eventsByDate.entries());
            return entries.map(([date, dayEvents], index) => {
              const isCollapsed = collapsedDays.has(date);
              const isLast = index === entries.length - 1;
              return (
                <div key={date} className="relative">
                  {/* Sticky date header */}
                  <div
                    className={cn(
                      "sticky top-0 z-[11] w-[calc(100%+2px)] translate-x-[-1px] text-base text-[#3A365E] font-medium py-2 border-solid bg-white cursor-pointer flex items-center justify-between",
                      !isLast && "border-b border-[rgba(224,224,235,1)]"
                    )}
                    onClick={() => toggleDayCollapse(date)}
                  >
                    <span>{moment(date).format("dddd, MMMM D")}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {dayEvents.length} event
                        {dayEvents.length !== 1 ? "s" : ""}
                      </span>
                      <svg
                        className={cn(
                          "w-4 h-4 transition-transform",
                          isCollapsed && "rotate-180"
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                  {/* Events for this date */}
                  {!isCollapsed && (
                    <div className="flex flex-col gap-1 pb-2 pt-1">
                      {dayEvents.map((placement) => (
                        <Event
                          key={`${date}-${placement.event.id}`}
                          event={placement.event}
                          selectedEvent={selectedEvent}
                          setSelectedEvent={setSelectedEvent}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {!listView && (
        <SwipeToScroll noBounds>
          <div className="text-black flex">
            {/* padding hack for mobile */}
            <div className="hidden touch-only:block w-4 md:w-0 h-[1px]"></div>
            <div className="w-full flex">
              <div
                className="grid shrink-0 min-w-full"
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
                        isDialog={false}
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
      )}
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

const NewScheduleIndex = (
  props: ScheduleProps & { viewMode: "list" | "grid" }
) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewScheduleIndexInner {...props} />
    </Suspense>
  );
};

export default NewScheduleIndex;
