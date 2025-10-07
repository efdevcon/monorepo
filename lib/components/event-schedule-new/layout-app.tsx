import React, { useState } from "react";
import NewScheduleIndex, { ScheduleProps } from "./index";
import ActionBar from "./action-bar";
import { Filter, FilterSummary, useFilters } from "./filter";
import filterCss from "./filter.module.scss";
import Link from "lib/components/link/Link";
import layoutCss from "./layout-app.module.scss";
import cn from "classnames";
import { withParcnetProvider } from "./zupass/zupass";
// import TicketPurple from "lib/assets/icons/ticket-purple.svg";

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
  } = useFilters(props.events, false, props.favoriteEvents);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 w-full bg-white",
        layoutCss["layout-app"]
      )}
    >
      <div className="flex-col md:flex-row flex justify-between gap-4 md:mt-1 md:mb-1 mb-1 mx-0 sm:mx-4">
        <div
          className={cn(
            "text-sm overflow-hidden px-4 py-2 text-[#36364C] self-center w-full",
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
          <div className="flex flex-col text-center md:text-left md:flex-row items-center gap-2 text-white">
            {/* <TicketPurple className="h-[26px] w-[26px] mr-2 shrink-0 hidden md:inline-block" /> */}
            <div className="flex flex-col">
              <div className="font-semibold leading-tight">
                These events are hosted inside La Rural and require a Devconnect
                World’s Fair ticket to enter.
              </div>
              <div>
                You may also need to sign up or purchase tickets for other
                events within the venue.
              </div>
            </div>
          </div>
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
        hideCommunityByDefault
        favorites={props.favoriteEvents}
      />

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
                showFavorites
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
            favoriteEvents={props.favoriteEvents}
            toggleFavoriteEvent={props.toggleFavoriteEvent}
            noUrlRouting
          />
        </div>
      </div>
    </div>
  );
};

export default withParcnetProvider(Layout);
