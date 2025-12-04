"use client";
import React, { useEffect, useState, Suspense, useRef } from "react";
import moment from "moment";
import Event from "./event/event";
import { computeCalendarRange } from "./calendar.utils";
import SwipeToScroll from "lib/components/event-schedule/swipe-to-scroll-native";
import { Event as EventType } from "./model";
import { format, parseISO } from "date-fns";
import cn from "classnames";
// import Timeline from "./timeline";
import NoEventsImage from "./images/404.png";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import DevconnectCubeLogo from "./images/cube-logo.png";
// import { eventShops } from "./zupass/event-shops-list";
import { useIsMobile } from "lib/hooks/useIsMobile";
import { useNow } from "lib/hooks/useNow";
import Export from "./export";

export const customUrlTransforms = [
  { from: "ethday", to: "84" },
  { from: "DSS", to: "86" },
  { from: "soliditysummit", to: "76" },
  { from: "moneyrails", to: "108" },
  { from: "trustless-eil", to: "109" },
  { from: "trustless-interop", to: "110" },
  { from: "bridge-atlas", to: "91" },
  { from: "worldcup", to: "106" },
  { from: "regulationday", to: "104" },
  { from: "agenticzero", to: "71" },
  { from: "defi-today", to: "107" },
  { from: "zero-to-dapp", to: "98" },
  { from: "zktls-day", to: "111" },
  { from: "zkid-day", to: "119" },
  { from: "organizer-hangout", to: "137" },
  { from: "trustlessagentsday", to: "136" },
  { from: "apptownhall", to: "142" },
  { from: "eip-summit", to: "162" },
  { from: "creator-economy", to: "168" },
  { from: "applications-to-fhe", to: "193" },
  { from: "obfuscation-day", to: "194" },
  { from: "closing-party", to: "245524" },
  // { from: 'stableconnect', to: '112' },
  // { from: 'pacificonnect', to: '112' },
];

/*
  TODO: 
  - Map all stages
  - Solve DSS case (it has two separate stages - confirm with the team)
  - Overide event location in event modal, add pin link to events
*/
export const stageNamesByEvent = {
  // XL STAGE events
  84: {
    name: "Ethereum Day",
    stageLabel: "La Rural - XL Stage",
    mapUrl: "/map?filter=xl-stage",
    programming: "/stages/xl?day=17",
  },
  82: {
    name: "ETHCON ARGENTINA",
    stageLabel: "La Rural - XL Stage",
    mapUrl: "/map?filter=xl-stage",
    programming: "/stages/xl?day=18",
  },
  110: {
    name: "trustless://interop.landscape",
    stageLabel: "La Rural - XL Stage",
    mapUrl: "/map?filter=xl-stage",
    programming: "/stages/xl?day=19",
  },
  71: {
    name: "Agentic Zero",
    stageLabel: "La Rural - XL Stage",
    mapUrl: "/map?filter=xl-stage",
    programming: "/stages/xl?day=20",
  },
  141: {
    name: "Ethereum Privacy Stack",
    stageLabel: "La Rural - XL Stage",
    mapUrl: "/map?filter=xl-stage",
    programming: "/stages/xl?day=21",
  },

  // XS STAGE events
  168: {
    name: "Newtro and Whabbit present 'The Creator Economy' powered by Crecimiento",
    stageLabel: "La Rural - XS Stage",
    mapUrl: "/map?filter=xs-stage",
    programming: "/stages/xs?day=19",
  },
  98: {
    name: "Zero to Dapp",
    stageLabel: "La Rural - XS Stage",
    mapUrl: "/map?filter=xs-stage",
    programming: "/stages/xs?day=20",
  },
  162: {
    name: "EIP Summit",
    stageLabel: "La Rural - XS Stage",
    mapUrl: "/map?filter=xs-stage",
    programming: "/stages/xs?day=21",
  },
  91: {
    name: "Bridge Atlas",
    stageLabel: "La Rural - XS Stage",
    mapUrl: "/map?filter=xs-stage",
    programming: "/stages/xs?day=22",
  },

  // bootcamp
  94: {
    name: "BuidlGuidl's Builder Bootcamp: Beginner to Advanced",
    stageLabel: "La Rural - Bootcamp",
    mapUrl: "/map?filter=poi-buidIguidl-bootcamp",
    programming: "/stages/bootcamp",
  },

  // m1 stage
  76: {
    name: "Solidity Summit",
    stageLabel: "La Rural - M1 Stage",
    mapUrl: "/map?filter=m1-stage",
    programming: "/stages/m1?day=18",
  },
  106: {
    name: "Crecimiento World Cup",
    stageLabel: "La Rural - M1 Stage",
    mapUrl: "/map?filter=m1-stage",
    programming: "/stages/m1?day=19",
  },
  107: {
    name: "Defi Day",
    stageLabel: "La Rural - M1 Stage",
    mapUrl: "/map?filter=m1-stage",
    programming: "/stages/m1?day=21",
  },
  104: {
    name: "Crecimiento Regulation Day",
    stageLabel: "La Rural - M1 Stage",
    mapUrl: "/map?filter=m1-stage",
    programming: "/stages/m1?day=20",
  },
  // 72: {
  //   name: "DeFi Day del Sur",
  //   stageLabel: "La Rural - M1 Stage",
  //   mapUrl: "/map?filter=m1-stage",
  //   programming: "/stages/m1?day=21",
  // },

  // m2 stage
  136: {
    name: "Trustless Agents Day",
    stageLabel: "La Rural - M2 Stage",
    mapUrl: "/map?filter=m2-stage",
    programming: "/stages/m2?day=21",
  },
  113: {
    name: "Ethereum Argentina Hackathon: Tierra de Buidlērs",
    stageLabel: "La Rural - M2 Stage",
    mapUrl: "/map?filter=m2-stage",
    programming: "/stages/m2",
  },
  120: {
    name: "Ethproofs Day",
    stageLabel: "La Rural - M2 Stage",
    mapUrl: "/map?filter=m2-stage",
    programming: "/stages/m2?day=22",
  },

  // nogal stage
  86: {
    name: "Defi Security Summit",
    stageLabel: "La Rural - Nogal Stage",
    mapUrl: "/map?filter=nogal-hall",
    // lazy fix for edge case with 2 stages for one event
    stageLabel2: "La Rural - L Stage",
    mapUrl2: "/map?filter=l-stage",
    programming: "/stages/l",
  },
  // 156 TODO: Defi Security 101 by DSS - which stage is this?
  193: {
    name: "Applications to FHE",
    stageLabel: "La Rural - Nogal Stage",
    mapUrl: "/map?filter=nogal-hall",
    programming: "/stages/nogal?day=22",
  },
  194: {
    name: "Obfuscation Day",
    stageLabel: "La Rural - Nogal Stage",
    mapUrl: "/map?filter=nogal-hall",
    programming: "/stages/nogal?day=22",
  },

  // ceibo
  119: {
    name: "ZKID Day",
    stageLabel: "La Rural - Ceibo Stage",
    mapUrl: "/map?filter=ceibo-hall",
    programming: "/stages/ceibo?day=19",
  },
  112: {
    name: "Noircon 3",
    stageLabel: "La Rural - Ceibo Stage",
    mapUrl: "/map?filter=ceibo-hall",
    programming: "/stages/ceibo?day=20",
  },
  137: {
    name: "Ethereum Community and Event Organizer Hangout",
    stageLabel: "La Rural - Ceibo Stage",
    mapUrl: "/map?filter=ceibo-hall",
    programming: "/stages/ceibo?day=21",
  },

  // l stage
  109: {
    name: "Trustless Interop Layer",
    stageLabel: "La Rural - L Stage",
    mapUrl: "/map?filter=l-stage",
    programming: "/stages/l?day=18",
  },
  301: {
    name: "<d/acc day>",
    stageLabel: "La Rural - L Stage",
    mapUrl: "/map?filter=l-stage",
    programming: "/stages/l?day=19",
  },
  // TODO: DSS would be here - which event is this??
  118: {
    name: "ETH/ACC DEMO DAY",
    stageLabel: "La Rural - L Stage",
    mapUrl: "/map?filter=l-stage",
    programming: "/stages/l?day=22",
  },

  // amphitheater stage
  142: {
    name: "App Town Hall ⌐◨-◨ ",
    stageLabel: "La Rural - Amphitheater Stage",
    mapUrl: "/map?filter=amphitheater",
    programming: "/stages/amphitheater?day=18",
  },
  124: {
    name: "University Track - UCEMA",
    stageLabel: "La Rural - Amphitheater Stage",
    mapUrl: "/map?filter=amphitheater",
    programming: "/stages/amphitheater",
  },
  130: {
    name: "University Track - UTN",
    stageLabel: "La Rural - Amphitheater Stage",
    mapUrl: "/map?filter=amphitheater",
    programming: "/stages/amphitheater",
  },
  129: {
    name: "University Track - Austral/IAE",
    stageLabel: "La Rural - Amphitheater Stage",
    mapUrl: "/map?filter=amphitheater",
    programming: "/stages/amphitheater",
  },
  314: {
    name: "University Track - UBA",
    stageLabel: "La Rural - Amphitheater Stage",
    mapUrl: "/map?filter=amphitheater",
    programming: "/stages/amphitheater",
  },
  170: {
    name: "University Track - Red Uniblock",
    stageLabel: "La Rural - Amphitheater Stage",
    mapUrl: "/map?filter=amphitheater",
    programming: "/stages/amphitheater",
  },
  131: {
    name: "University Track - Champagnat",
    stageLabel: "La Rural - Amphitheater Stage",
    mapUrl: "/map?filter=amphitheater",
    programming: "/stages/amphitheater",
  },
  132: {
    name: "University Track - Fundacion Blockchain",
    stageLabel: "La Rural - Amphitheater Stage",
    mapUrl: "/map?filter=amphitheater",
    programming: "/stages/amphitheater",
  },
  128: {
    name: "University Track - Trama (ITBA)",
    stageLabel: "La Rural - Amphitheater Stage",
    mapUrl: "/map?filter=amphitheater",
    programming: "/stages/amphitheater",
  },
  127: {
    name: "University Track - Di Tella Club Blockchain",
    stageLabel: "La Rural - Amphitheater Stage",
    mapUrl: "/map?filter=amphitheater",
    programming: "/stages/amphitheater",
  },
  // TODO: university track, all of them need the reference to the stage?
  164: {
    name: "University Track",
    stageLabel: "La Rural - University Track",
    mapUrl: "/map?filter=amphitheater",
    programming: "/stages/amphitheater",
  },
};

const stageUrlsByEvent = {
  // xl stage
  // ethday done
  // ethcon argentina done
  // trustless interop landscape done
  // agentic zero done
  // ethereum privacy stack done
  // xs stage
  // Newtro and Whabbit done
  // Zero to dapp
  // EIP summit at devconnect
  // Bridge atlas
  // bootcamp  stage
  // buidlguidl
  // m1 stage
  // solidity summit
  // crecimiento startup worldcup
  // crecimiento regulation day 104
  // defi day done
  // trustx / trillion dollar security ??? Which event is this??
  // m2 stage
  // trustless agents day
  // Ethereum hackathon tierrra de builders
  // eth proofs
  // nogal  stage
  // dss (nov 21)
  // + FHE
  // obfuscation day
  // ceibo stage
  // zkid day
  // noircon 3
  // ethereum community and event organizer hangout
  // l-stage
  // trustless interop layer
  // d/acc day
  // DSS (nov 20+21)
  // eth/acc demo day
  // amphitheater stage
  // app town hall
  // university track
  // "84": {
  //   url: "/stages/ethday",
  //   name: "EthDay",
  // },
};

export type ScheduleProps = {
  isCommunityCalendar?: boolean;
  favoriteEvents?: string[];
  renderProgrammingCTA?: any;
  renderTicketsCTA?: any;
  renderProgrammingCTADialog?: any;
  renderTicketsCTADialog?: any;
  toggleFavoriteEvent?: (eventId: string) => void;
  events: EventType[];
  noUrlRouting?: boolean;
  noZupass?: boolean;
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

    const day1 = moment.utc(a.timeblocks[0].start).dayOfYear();
    const day2 = moment.utc(b.timeblocks[0].start).dayOfYear();
    const lastDay1 = moment
      .utc(a.timeblocks[a.timeblocks.length - 1].end)
      .dayOfYear();
    const lastDay2 = moment
      .utc(b.timeblocks[b.timeblocks.length - 1].end)
      .dayOfYear();

    const isSameDay = day1 === day2;
    const isSameLastDay = lastDay1 === lastDay2;

    if (isSameLastDay && isSameDay) {
      if (
        a.id.toString() === "devconnect-happy-hour" &&
        b.id.toString() !== "devconnect-happy-hour"
      )
        return -1;
      if (
        a.id.toString() !== "devconnect-happy-hour" &&
        b.id.toString() === "devconnect-happy-hour"
      )
        return 1;
      if (a.id.toString() === "272" && b.id.toString() !== "272") return -1;
      if (a.id.toString() !== "272" && b.id.toString() === "272") return 1;
      if (a.isCoreEvent && !b.isCoreEvent) return -1;
      if (!a.isCoreEvent && b.isCoreEvent) return 1;

      return (a.priority ?? 0) > (b.priority ?? 0) ? -1 : 1;
    }

    if (isSameDay) {
      return (
        moment.utc(b.timeblocks[b.timeblocks.length - 1].end).valueOf() -
        moment.utc(a.timeblocks[a.timeblocks.length - 1].end).valueOf()
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

// const devconnectMoment = moment("2025-11-18 10:30:00");

const NewScheduleIndexInner = ({
  // selectedEvent,
  // selectedDay,
  // setSelectedEvent,
  // setSelectedDay,
  renderProgrammingCTA,
  renderTicketsCTA,
  renderProgrammingCTADialog,
  renderTicketsCTADialog,
  favoriteEvents,
  toggleFavoriteEvent,
  events,
  viewMode,
  noUrlRouting,
  noZupass,
}: ScheduleProps & { viewMode: "list" | "grid" }) => {
  // Opt out of url based routing
  const [selectedEventInlineState, setSelectedEventInlineState] = useState<
    string | null
  >(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [exports, setExports] = useState<EventType[] | null>(null);
  const eventRange = computeCalendarRange(events);
  // const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const isMobile = useIsMobile(768);
  const now = useNow();

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
  const span = isMobile ? "280px" : "240px";
  const columnTemplate = `repeat(${eventRange.length}, minmax(auto, ${span}))`;

  // Check if an event should be highlighted based on hovered date
  // const isEventHighlighted = (placement: any) => {
  //   if (!hoveredDate) return false;

  //   // Check if any of the dates covered by this event match the hovered date
  //   return placement.datesCovered.includes(hoveredDate);
  // };

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
        if (noUrlRouting) {
          setSelectedEventInlineState(ethDayEvent.id.toString());
          return;
        }

        router.replace(`${pathname}?event=ethday`, { scroll: false });
      };

      return () => {
        delete (window as any).selectEthDay;
      };
    }
  }, []);

  const getEventIdFromUrl = (eventId: string) => {
    const transformMatch = customUrlTransforms.find(
      (transform) => transform.from === eventId.toString()
    );

    if (transformMatch) {
      eventId = transformMatch.to;
    }

    return eventId;
  };

  const selectedEvent = (() => {
    if (typeof window === "undefined") return;

    const currentUrlParams = new URLSearchParams(searchParams);

    const eventId = noUrlRouting
      ? selectedEventInlineState
      : getEventIdFromUrl(currentUrlParams.get("event") || "");

    return events.find((event) => {
      return (
        event.id.toString() === eventId ||
        event.rkey?.toLowerCase() === eventId?.toLowerCase()
      );
    });
  })();

  useEffect(() => {
    if (noUrlRouting) {
      const currentUrlParams = new URLSearchParams(searchParams);
      const eventId = getEventIdFromUrl(currentUrlParams.get("event") || "");

      setSelectedEventInlineState(eventId);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const setSelectedEvent = (event: EventType | null) => {
    if (typeof window === "undefined") return;

    const currentParams = new URLSearchParams(searchParams);

    if (!event) {
      if (noUrlRouting) {
        setSelectedEventInlineState(null);

        return;
      }

      currentParams.delete("event");
      // setSelectedEventId(null);
    } else {
      let nextEventId = event.rkey || event.id;

      const transformMatch = customUrlTransforms.find(
        (transform) => transform.to === event.id.toString()
      );

      if (transformMatch) {
        nextEventId = transformMatch.from;
      }

      if (noUrlRouting) {
        setSelectedEventInlineState(event.id.toString());

        return;
      }

      currentParams.set("event", nextEventId);
    }

    // Update URL without any navigation using native History API
    const paramsString = currentParams.toString();
    const newUrl = paramsString ? `${pathname}?${paramsString}` : pathname;

    router.replace(newUrl, { scroll: false });
  };

  const listView = viewMode === "list" && isMobile;

  const selectedEventForDialog =
    eventPlacements.find(
      (placement) => placement.event.id === selectedEvent?.id
    ) || null;

  // State for managing open days in list view - closed by default
  const today = now.format("YYYY-MM-DD");
  const [openDays, setOpenDays] = useState<Set<string>>(new Set([today]));

  return (
    <>
      {selectedEventForDialog && (
        <Event
          noZupass={noZupass}
          event={selectedEventForDialog?.event}
          isDialog={true}
          selectedEvent={selectedEvent || null}
          setSelectedEvent={setSelectedEvent}
          setExports={setExports}
          toggleFavoriteEvent={toggleFavoriteEvent}
          favoriteEvents={favoriteEvents}
          renderProgrammingCTA={renderProgrammingCTA}
          renderTicketsCTA={renderTicketsCTA}
          renderProgrammingCTADialog={renderProgrammingCTADialog}
          renderTicketsCTADialog={renderTicketsCTADialog}
        />
      )}

      {exports && (
        <Export events={exports} setExports={() => setExports(null)} />
      )}

      {listView && (
        <div className="flex flex-col w-full px-4">
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

            // Toggle function for opening/closing days
            const toggleDayOpen = (date: string) => {
              setOpenDays((prev) => {
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
              const isOpen = openDays.has(date);
              const isLast = index === entries.length - 1;
              const isToday = date === today;
              return (
                <div key={date} className="relative">
                  {/* Sticky date header */}
                  <div
                    data-type="list-day-header"
                    className={cn(
                      "sticky top-0 z-[11] w-[calc(100%+2px)] translate-x-[-1px] text-base text-[#3A365E] font-semibold py-2.5 border-solid cursor-pointer flex items-center justify-between",
                      !isLast && "border-b border-[rgba(224,224,235,1)]",
                      isToday && "text-[#165a8d] !font-bold"
                    )}
                    onClick={() => toggleDayOpen(date)}
                  >
                    <span className="text-base">
                      {isToday
                        ? "Today 👀"
                        : moment(date).format("dddd, MMM D")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">
                        {dayEvents.length} event
                        {dayEvents.length !== 1 ? "s" : ""}
                      </span>
                      <svg
                        className={cn(
                          "w-4 h-4 transition-transform",
                          !isOpen && "rotate-180"
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
                  {isOpen && (
                    <div className="flex flex-col gap-1 pb-2 pt-1">
                      {dayEvents.map((placement) => (
                        <Event
                          noZupass={noZupass}
                          key={`${date}-${placement.event.id}`}
                          event={placement.event}
                          selectedEvent={selectedEvent || null}
                          setSelectedEvent={setSelectedEvent}
                          setExports={setExports}
                          toggleFavoriteEvent={toggleFavoriteEvent}
                          favoriteEvents={favoriteEvents}
                          renderProgrammingCTA={renderProgrammingCTA}
                          renderTicketsCTA={renderTicketsCTA}
                          renderProgrammingCTADialog={
                            renderProgrammingCTADialog
                          }
                          renderTicketsCTADialog={renderTicketsCTADialog}
                          compact={isMobile}
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
          <div className="section w-full" data-type="schedule-container">
            <div className="text-black flex">
              {/* padding hack for mobile */}
              {/* <div className="hidden touch-only:block w-4 md:w-0 h-[1px]"></div> */}
              <div className="w-full flex">
                <div
                  className="grid shrink-0 min-w-full"
                  style={{
                    gridTemplateColumns: columnTemplate,
                    gridTemplateRows: "auto 1fr",
                  }}
                >
                  {/* Header row with dates */}
                  {/* <div className="contents relative"> */}
                  {eventRange.map((date) => {
                    const isToday = date === today;
                    return (
                      <div
                        key={date}
                        className={cn(
                          "text-sm cursorr-pointer flex items-center justify-between hoverr:bg-gray-100 font-medium py-2 px-3 mr-1 mb-1.5 lg:sticky lg:top-[4px] bg-white z-50 border border-solid border-neutral-300 transiation-all duration-300",
                          !isDateInDevconnectRange(date) && "!bg-blue-50",
                          isToday && "text-[#165a8d] !font-bold"
                          // selectedDay === date && "!bg-slate-100 !opacity-100",
                          // selectedDay !== null && "opacity-20"
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
                            {isToday ? "Today" : formatDateHeader(date).day}{" "}
                          </div>
                          <div className="">{formatDateHeader(date).date}</div>
                        </div>
                      </div>
                    );
                  })}
                  {/* </div> */}

                  {/* <div
                className="left-0 z-[9] top-[100%] mt-2"
                style={{
                  gridColumn: `1 / span ${eventRange.length}`, // Span all columns
                }}
              >
                <Timeline events={dummyEvents} />
                {selectedDay && <MapComponent />}
              </div> */}

                  {/* <div className={cn("contents")}> */}
                  {eventPlacements.map((placement, idx) => (
                    <div
                      key={`event-${placement.event.id}-${idx}`}
                      style={{
                        gridRow: `${placement.gridPosition.row + 1} / span ${
                          placement.gridPosition.rowSpan
                        }`,
                        gridColumn: `${placement.gridPosition.column} / span ${placement.gridPosition.duration}`,
                      }}
                      className={`bg-white rounded-lg border mr-1 mt-0.5 relative transition-all duration-200]`}
                    >
                      <Event
                        noZupass={noZupass}
                        event={placement.event}
                        isDialog={false}
                        // className={
                        //   isEventHighlighted(placement)
                        //     ? "!border-neutral-500"
                        //     : ""
                        // }
                        compact={isMobile}
                        selectedEvent={selectedEvent || null}
                        setSelectedEvent={setSelectedEvent}
                        setExports={setExports}
                        toggleFavoriteEvent={toggleFavoriteEvent}
                        favoriteEvents={favoriteEvents}
                        renderProgrammingCTA={renderProgrammingCTA}
                        renderTicketsCTA={renderTicketsCTA}
                        renderProgrammingCTADialog={renderProgrammingCTADialog}
                        renderTicketsCTADialog={renderTicketsCTADialog}
                      />
                    </div>
                  ))}
                  {/* </div> */}
                </div>
                <div className="w-4 md:w-8 h-[1px] shrink-0"></div>
              </div>
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
