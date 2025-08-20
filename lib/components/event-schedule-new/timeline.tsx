import React, { useMemo, useRef, useState, useEffect } from "react";
import { Event } from "./model";
import { format, parseISO, addHours } from "date-fns";
import cn from "classnames";
import Image from "next/image";
import SwipeToScroll from "lib/components/event-schedule/swipe-to-scroll";
import useDimensions from "react-cool-dimensions";
import { computeCalendarRange } from "./calendar.utils";
// @ts-ignore
import { useCalendarStore } from "store/calendar";
import { Star } from "lucide-react";
// @ts-ignore
import coworkingImage from "./day/cowork.webp";
import { useDraggableLink } from "lib/hooks/useDraggableLink";

const width = 80;

// Component to display room headers
const RoomGrid = ({ locations }: { locations: string[] }) => {
  const [isNativeScroll, setIsNativeScroll] = useState(false);

  useEffect(() => {
    const isNativeScroll = !window.matchMedia("not all and (hover: none)")
      .matches;
    setIsNativeScroll(isNativeScroll);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col shrink-0 z-[5] left-0",
        isNativeScroll ? "absolute" : "relative"
      )}
      style={{
        gridTemplateColumns: `repeat(${locations.length}, minmax(${width}px, 1fr))`,
      }}
    >
      <div className="p-2 h-[40px] flex justify-center items-center bg-[#F5F7FA] !bg-transparent borderz border-gray-100 border-solid">
        <div></div>
      </div>

      {locations.map((location, index) => (
        <div
          key={index}
          className={`bg-white/90 bg-blur-sm p-2 text-xs line-clamp-1 overflow-hidden text-ellipsis  whitespace-nowrap h-[40px] w-[${width}px] flex items-center  border border-solid border-gray-100 glass`}
        >
          <div className="text-xs text-gray-500 truncate">{location}</div>
        </div>
      ))}
    </div>
  );
};

// Component for displaying a single event in the timeline
const TimelineEvent = ({
  event,
  timeblock,
  width,
}: {
  event: Event;
  timeblock: Event["timeblocks"][0];
  width: number;
}) => {
  const { selectedEvent, setSelectedEvent } = useCalendarStore();
  // Determine CSS class based on difficulty
  const difficultyClass =
    event.difficulty === "Beginner"
      ? "bg-green-300"
      : event.difficulty === "Intermediate"
      ? "bg-yellow-300"
      : "bg-red-300";

  const isCoworking = event.id.toString() === "23"; // event.name.includes("Coworking");
  const isETHDay = event.id.toString() === "29"; // event.name.includes("ETH Day");

  // Use timeblock name if available, otherwise use event name
  const displayName = timeblock.name || event.name;
  const dragAttributes = useDraggableLink();

  return (
    <div
      className={cn(
        "absolute h-full",
        "cursor-pointer",
        "flex gap-2 border border-solid border-neutral-300 justify-center p-1 px-2 relative rounded overflow-hidden hover:border-black transition-all duration-300 z-[1] hover:z-[2]",
        {
          "bg-[rgb(187,232,255)]": isCoworking || isETHDay,
          "bg-[#f0faff]": !isCoworking && !isETHDay,
        }
      )}
      style={{ width: `${width}px` }}
      {...dragAttributes}
      onClick={(e) => {
        const allowed = dragAttributes.onClick?.(e);
        // console.log('prevented', prevented)
        if (allowed) {
          setSelectedEvent(event);
        } else {
          e.preventDefault();
        }
      }}
      // onClickCapture={e => {
      //   if (prevented) {
      //     e.preventDefault()
      //   } else {
      //     setSelectedEvent(event)
      //   }
      // }}
    >
      <div className="flex flex-col items-start justify-center">
        <div className="text-[11px] font-medium line-clamp-1 shrink-0 left-0 block">
          {displayName}
        </div>
        {timeblock.name && (
          <div className="text-[9px] text-gray-600 mt-0.5 shrink-0">
            {event.name}
          </div>
        )}
      </div>

      <div className="flex gap-2 shrink-0 grow sticky right-0 text-[9px] items-center">
        <div
          className={`rounded text-[10px] ${difficultyClass} px-2 py-0.5 flex gap-1.5 items-center border border-solid border-neutral-700`}
        >
          {event.difficulty}
        </div>
        <div className="rounded text-[10px] bg-[#bef0ff] px-2 py-0.5 flex gap-1 items-center justify-end border border-solid border-neutral-700">
          <Star className="text-black shrink-0" size={11} />
          RSVP
        </div>
      </div>

      {/* {isCoworking && (
        <div className="absolute left-[0%] top-0 bottom-0 max-w-full overflow-hidden z-[1]">
          <div className="absolute left-0 top-0 bottom-0 w-[50%] bg-gradient-to-r from-white to-transparent z-1"></div>
          <Image
            src={coworkingImage}
            alt="Coworking"
            className="sticky left-0 h-full w-full object-start position-start object-cover"
          />
        </div>
      )} */}

      {/* <div className="flex gap-1 mt-1 items-center justify-end">
        <div className={`rounded text-[8px] ${difficultyClass} px-1 py-0.5`}>{event.difficulty}</div>
      </div> */}
    </div>
  );
};

// Component for a single day grid with events
const DayGrid = ({
  locations,
  eventsByLocation,
  timeSlots,
  day,
  getTimeblockLocation,
}: {
  locations: string[];
  eventsByLocation: Record<
    string,
    Array<{ event: Event; timeblock: Event["timeblocks"][0] }>
  >;
  timeSlots: Date[];
  day: string;
  getTimeblockLocation: (
    event: Event,
    timeblock: Event["timeblocks"][0]
  ) => string;
}) => {
  const now = new Date();
  const scrollSyncRef = useRef<HTMLDivElement>(null);
  const [isNativeScroll, setIsNativeScroll] = useState(false);

  const { observe } = useDimensions({
    onResize: ({ width }) => {
      const isNativeScroll = !window.matchMedia("not all and (hover: none)")
        .matches;
      setIsNativeScroll(isNativeScroll);
    },
  });

  return (
    <div
      className={cn(
        "flex shrink-0 w-full relative",
        isNativeScroll ? "left-[0px]" : "left-[0px]"
      )}
    >
      <div className="flex flex-col">
        <div
          className={cn(
            "grid shrink-0 sticky top-[0px] z-[12] !border-none pointer-events-none bg-white",
            isNativeScroll ? "!overflow-x-auto !translate-x-0" : "glass"
          )}
          style={{
            gridTemplateColumns: `repeat(${timeSlots.length}, minmax(80px, 1fr))`,
          }}
          ref={(element) => {
            // @ts-ignore
            scrollSyncRef.current = element!;
            observe(element);
          }}
        >
          <div
            data-type="day"
            className={cn(
              "absolute left-0 top-0 w-[80px] h-[40px] flex items-center",
              isNativeScroll ? "translate-x-[0px]" : "translate-x-[-80px]",
              "border-bottom border-top z-[1]"
            )}
          >
            {/* <div className="sticky left-0 !bg-[#F5F7FA] h-full inline-flex items-center text-sm font-semibold w-[100px] justify-center">
              {format(parseISO(day), 'MMM dd')}
            </div> */}
            <div className="sticky left-0 h-full bg-white inline-flex items-center text-sm font-semibold w-[80px] justify-center">
              {/* {format(parseISO(day), 'MMM dd')} */}
            </div>
          </div>

          {timeSlots.map((time, index) => {
            const isCurrent =
              time <= now && new Date(time.getTime() + 10 * 60000) > now;

            let offset = 0;
            if (isCurrent) {
              const minutesElapsed = Math.floor(
                (now.getTime() - time.getTime()) / 60000
              );
              offset = (minutesElapsed / 10) * 80;
            }

            return (
              <div
                key={index}
                className={cn(
                  "py-2 text-sm whitespace-nowrap relative flex items-center w-[80px] h-[40px] border-top !bg-[white] border-bottom z-[1]"
                )}
                style={{
                  transform: isNativeScroll
                    ? "translateX(80px)"
                    : "translateX(var(--scroll-x))",
                }}
              >
                {isCurrent && (
                  <div
                    className={cn(
                      "absolute left-0 top-0 w-[7px] h-full flex items-end justify-center"
                    )}
                    style={{ transform: `translateX(${offset}px)` }}
                  >
                    <div className="absolute left-[-1px] top-0 w-[2px] h-full bg-red-200"></div>
                    <div className="bg-red-400 w-[7px] h-[7px] rounded-full flex justify-center translate-y-1/2 -translate-x-1/2"></div>
                  </div>
                )}

                <div
                  style={{
                    transform:
                      index > -1 ? "translateX(-50%)" : "translateX(0)",
                  }} // set index to 0 to indent the first time slot
                  className="flex flex-col justify-center items-center"
                >
                  <p className="text-xs">{format(time, "h:mm a")}</p>
                  <p className="text-[8px] leading-[6px] text-gray-500">
                    {format(time, "MMM dd")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <SwipeToScroll
          speed={1.5}
          noScrollReset
          syncElement={scrollSyncRef as any}
        >
          <div className={cn("flex", isNativeScroll ? "" : "")}>
            <div
              className={cn(
                "grid relative shrink-0",
                isNativeScroll ? "translate-x-[80px]" : ""
              )}
              style={{
                gridTemplateColumns: `repeat(${timeSlots.length}, minmax(80px, 1fr))`,
              }}
            >
              {locations.map((location, locationIndex) => {
                const events = eventsByLocation[location] || [];

                const eventsByTimeslotStart: Record<
                  string,
                  Array<{
                    eventItem: {
                      event: Event;
                      timeblock: Event["timeblocks"][0];
                    };
                    columns: number;
                    columnIndent: number;
                  }>
                > = {};

                if (events.length > 0) {
                  events.forEach((eventItem) => {
                    const { event, timeblock } = eventItem;
                    const start = parseISO(timeblock.start);
                    const end = parseISO(timeblock.end);
                    const durationInMinutes =
                      (end.getTime() - start.getTime()) / 60000;
                    const columns = durationInMinutes / 10;

                    const excessMinutes = start.getMinutes() % 10;
                    const nearestTen = new Date(start);
                    nearestTen.setMinutes(start.getMinutes() - excessMinutes);

                    const startFormatted = format(nearestTen, "h:mm a");

                    if (!eventsByTimeslotStart[startFormatted]) {
                      eventsByTimeslotStart[startFormatted] = [];
                    }

                    eventsByTimeslotStart[startFormatted].push({
                      eventItem,
                      columns,
                      columnIndent: excessMinutes * 0.1,
                    });
                  });
                }

                return (
                  <React.Fragment key={locationIndex}>
                    {timeSlots.map((timeslot, slotIndex) => {
                      const matches =
                        eventsByTimeslotStart[format(timeslot, "h:mm a")] || [];

                      if (!matches.length) {
                        return (
                          <div
                            key={slotIndex}
                            className="bg-white border border-gray-100 border-solid h-[40px]"
                          ></div>
                        );
                      }

                      return (
                        <div
                          key={slotIndex}
                          className={`bg-white border border-gray-100 border-solid h-[40px] relative max-w-[80px]`}
                        >
                          {matches.map((match, index) => {
                            const { event, timeblock } = match.eventItem;
                            return (
                              <div
                                key={index}
                                className="absolute h-full py-[1px]"
                                style={{
                                  width: `${match.columns * 80}px`,
                                  left: `${match.columnIndent * 80}px`,
                                }}
                              >
                                <TimelineEvent
                                  event={event}
                                  timeblock={timeblock}
                                  width={match.columns * 80}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </SwipeToScroll>
      </div>
    </div>
  );
};

// Main Timeline component
const Timeline = ({ events }: { events: Event[] }) => {
  const { selectedDay, setSelectedDay } = useCalendarStore();

  // Create a memoized version of timeslots for each day to prevent recalculations
  const days = useMemo(() => {
    return computeCalendarRange(events);
  }, [events]);

  // Get all possible locations from events and timeblocks
  const allLocations = useMemo(() => {
    const uniqueLocations = new Set<string>();

    // Add event-level locations
    events.forEach((event) => {
      // @ts-ignore
      uniqueLocations.add(event.location.text);

      // Add timeblock-specific locations if they exist
      event.timeblocks.forEach((tb) => {
        if (tb.location) {
          uniqueLocations.add(tb.location);
        }
      });
    });

    return Array.from(uniqueLocations).sort();
  }, [events]);

  // Helper function to determine the effective location for a timeblock
  const getTimeblockLocation = (
    event: Event,
    timeblock: Event["timeblocks"][0]
  ): string => {
    // @ts-ignore
    return timeblock.location || event.location.text;
  };

  // Group events by day and location, now considering timeblock-specific locations
  const eventsByDayAndLocation = useMemo(() => {
    const result: Record<
      string,
      Record<string, Array<{ event: Event; timeblock: Event["timeblocks"][0] }>>
    > = {};

    days.forEach((day) => {
      result[day] = {};

      // Initialize all locations for this day
      allLocations.forEach((location) => {
        result[day][location] = [];
      });

      // Assign events to locations based on their timeblocks
      events.forEach((event) => {
        event.timeblocks.forEach((timeblock) => {
          const start = parseISO(timeblock.start);
          const dayString = format(start, "yyyy-MM-dd");

          if (dayString === day) {
            // Use timeblock location if available, otherwise use event location
            const effectiveLocation = getTimeblockLocation(event, timeblock);

            if (result[day][effectiveLocation]) {
              result[day][effectiveLocation].push({ event, timeblock });
            }
          }
        });
      });
    });

    return result;
  }, [events, days, allLocations]);

  // For each day, determine which locations have events
  const locationsByDay = useMemo(() => {
    const result: Record<string, string[]> = {};

    days.forEach((day) => {
      const locationsWithEvents = allLocations.filter((location) => {
        return (
          eventsByDayAndLocation[day][location] &&
          eventsByDayAndLocation[day][location].length > 0
        );
      });

      // Sort locations - could add custom sorting logic here if needed
      result[day] = locationsWithEvents.sort();
    });

    return result;
  }, [days, allLocations, eventsByDayAndLocation]);

  // Generate time slots (10-minute intervals) for each day
  const generateTimeSlots = (day: string) => {
    // Find all timeblocks for this day
    const dayTimeblocks: Array<{ start: Date; end: Date }> = [];

    events.forEach((event) => {
      event.timeblocks.forEach((tb) => {
        const start = parseISO(tb.start);
        const end = parseISO(tb.end);

        if (format(start, "yyyy-MM-dd") === day) {
          dayTimeblocks.push({ start, end });
        }
      });
    });

    if (dayTimeblocks.length === 0) return [];

    // Find earliest start and latest end for the day
    let earliestStart = dayTimeblocks[0].start;
    let latestEnd = dayTimeblocks[0].end;

    dayTimeblocks.forEach(({ start, end }) => {
      if (start < earliestStart) {
        earliestStart = start;
      }

      if (end > latestEnd) {
        latestEnd = end;
      }
    });

    // Create copies to avoid mutating the original references
    const startTime = new Date(earliestStart);
    const endTime = new Date(latestEnd);

    // Round down to nearest 10 minute interval
    startTime.setMinutes(Math.floor(startTime.getMinutes() / 10) * 10);
    startTime.setSeconds(0);

    // Round up to next 10 minute interval
    endTime.setMinutes(Math.ceil(endTime.getMinutes() / 10) * 10);
    endTime.setSeconds(0);

    const slots = [];
    const current = new Date(startTime);

    while (current <= endTime) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + 10);
    }

    return slots;
  };

  // Create timeslot cache for each day
  const timeSlotsByDay = useMemo(() => {
    if (!events.length) return {};

    const result: Record<string, Date[]> = {};
    days.forEach((day) => {
      result[day] = generateTimeSlots(day);
    });
    return result;
  }, [days, events]);

  if (!events.length) return null;

  return (
    <div className="flex flex-col gap-[36px]" style={{ contain: "auto" }}>
      {days.map((day) => {
        const timeSlots = timeSlotsByDay[day] || [];
        if (timeSlots.length === 0) return null;
        if (day !== selectedDay) return null;

        // Get only locations that have events for this day
        const locationsForDay = locationsByDay[day] || [];
        if (locationsForDay.length === 0) return null;

        return (
          <div key={day} className="flex relative">
            <RoomGrid locations={locationsForDay} />
            <DayGrid
              day={day}
              locations={locationsForDay}
              eventsByLocation={eventsByDayAndLocation[day]}
              timeSlots={timeSlots}
              getTimeblockLocation={getTimeblockLocation}
            />
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
