import React, { useState } from "react";
import NewSchedule, { ScheduleProps } from "./index";
import ActionBar from "./action-bar";
import { Filter, FilterSummary, useFilters } from "./filter";
import filterCss from "./filter.module.scss";

type CalendarLayoutProps = ScheduleProps & {
  isCommunityCalendar: boolean;
};

const Layout = (props: CalendarLayoutProps) => {
  const {
    filterOpen,
    setFilterOpen,
    filteredEvents,
    filterableValues,
    keysToFilterOn,
  } = useFilters(props.events);

  return (
    <div className="section overflow-visible touch-only:contents">
      <div className="flex flex-col gap-4 w-full">
        <div className="flex justify-between gap-4 mt-4 mb-1">
          <div className="text-3xl hidden md:block font-secondary">
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
                  Events held within La Rural (ticket required)
                </div>
              </div>
            )}
          </div>
          <div className="text-sm rounded-md bg-[#74ACDF33] px-4 py-2 text-[#36364C] self-center">
            This calendar is a work in progress and will change before
            Devconnect week. <b>Check back regularly for updates.</b>
            {/* <RichText content={data.pages.calendar_disclaimer} /> */}
          </div>
        </div>

        <ActionBar
          isCommunityCalendar={props.isCommunityCalendar}
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          filterableValues={filterableValues}
        />

        <div className="relative flex">
          {filterOpen && (
            <>
              <div className="relative shrink-0 z-10 w-[min(315px,100%)] h-full mr-3">
                <Filter
                  events={props.events}
                  filterOpen={filterOpen}
                  keysToFilterOn={keysToFilterOn}
                  filterableValues={filterableValues}
                  setFilterOpen={setFilterOpen}
                  // {...filterAttributes}
                  // edition={props.edition}
                  // favorites={favorites}
                />
              </div>
              <div className={filterCss["fade"]} />
            </>
          )}

          <div className="grow">
            <NewSchedule {...props} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
