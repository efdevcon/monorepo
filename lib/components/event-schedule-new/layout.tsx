import React, { useState } from "react";
import NewScheduleIndex, { ScheduleProps } from "./index";
import ActionBar from "./action-bar";
import { Filter, FilterSummary, useFilters } from "./filter";
import filterCss from "./filter.module.scss";
import Link from "lib/components/link/Link";
import { withParcnetProvider } from "./zupass/zupass";
import TicketPurple from "lib/assets/icons/ticket-purple.svg";
import cn from "classnames";

type CalendarLayoutProps = ScheduleProps & {
  isCommunityCalendar: boolean;
};

const Layout = (props: CalendarLayoutProps) => {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const {
    filterOpen,
    setFilterOpen,
    filteredEvents,
    filterableValues,
    keysToFilterOn,
    filter,
    setFilter,
    resetFilter,
    filterActive,
  } = useFilters(props.events, true);

  return (
    <div className="section overflow-visible touch-only:!contents text-left">
      <div className="flex flex-col gap-4 w-full bg-white">
        <div className="mouse-only:!contents section">
          <div className="flex-col md:flex-row flex justify-between gap-4 md:mt-4 md:mb-1 mb-4">
            <div className="text-3xl font-secondary shrink-0">
              {props.isCommunityCalendar ? (
                <div className="flex flex-col">
                  <b>Community Calendar</b>
                  <div className="text-base font-secondary">
                    Events held around Buenos Aires
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <b>Devconnect ARG schedule </b>
                  <div className="text-base font-secondary">
                    Events held within La Rural require a{` `}
                    <Link
                      href="https://tickets.devconnect.org"
                      className="text-blue-500 font-medium"
                    >
                      world's fair ticket{` `}
                    </Link>
                    to enter.
                  </div>
                </div>
              )}
            </div>
            <div
              className={cn(
                "text-sm overflow-hidden px-4 py-2 text-[#36364C] self-center",
                props.isCommunityCalendar
                  ? "bg-[#74ACDF33]"
                  : "bg-[#3A365E] border border-transparent"
              )}
              style={
                !props.isCommunityCalendar
                  ? {
                      borderImage:
                        "linear-gradient(137.84deg, #F6B613 12.86%, #FF85A6 40.77%, #9894FF 67.87%, #8855CC 97.26%)",
                      borderImageSlice: 1,
                      borderWidth: "1px",
                      borderStyle: "solid",
                    }
                  : undefined
              }
            >
              {props.isCommunityCalendar ? (
                <>
                  This calendar is a work in progress and will change before
                  Devconnect week. <b>Check back regularly for updates.</b>
                  <br />
                </>
              ) : (
                <div className="flex flex-col text-center md:text-left md:flex-row items-center gap-2 text-white">
                  <TicketPurple className="h-[26px] w-[26px] inline-block mr-2 shrink-0" />
                  <div className="flex flex-col">
                    <div className="font-semibold leading-tight">
                      Events hosted inside La Rural require a Devconnect World’s
                      Fair ticket to enter.
                    </div>
                    <div>
                      You may also need to sign up or purchase tickets for other
                      events within the venue.
                    </div>
                  </div>
                </div>
              )}

              {/* <RichText content={data.pages.calendar_disclaimer} /> */}
            </div>
          </div>

          <ActionBar
            isCommunityCalendar={props.isCommunityCalendar}
            filterOpen={filterOpen}
            setFilterOpen={setFilterOpen}
            filterableValues={filterableValues}
            filterActive={filterActive}
            setFilter={setFilter}
            resetFilter={resetFilter}
            filter={filter}
            events={props.events}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </div>

        <div className="relative flex">
          {filterOpen && (
            <>
              <div className="relative shrink-0 z-10 w-[min(315px,100%)] h-full mr-3 contents">
                <Filter
                  events={props.events}
                  filterOpen={filterOpen}
                  keysToFilterOn={keysToFilterOn}
                  filterableValues={filterableValues}
                  setFilterOpen={setFilterOpen}
                  filter={filter}
                  setFilter={setFilter}
                  resetFilter={resetFilter}
                  filterActive={filterActive}
                />
              </div>
              <div className={filterCss["fade"]} />
            </>
          )}

          <div className="grow relative">
            {/* white gradient to indicate more events on the right for mobile */}
            <div className="absolute top-0 right-0 w-4 h-full bg-gradient-to-l from-white via-white/60 to-transparent pointer-events-none z-10 mouse-only:hidden"></div>
            <NewScheduleIndex
              {...props}
              events={filteredEvents}
              viewMode={viewMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default withParcnetProvider(Layout);
