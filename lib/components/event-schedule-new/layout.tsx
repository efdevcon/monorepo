import React from "react";
import NewSchedule, { ScheduleProps } from "./index";
import ActionBar from "./action-bar";

type CalendarLayoutProps = ScheduleProps & {
  isCommunityCalendar: boolean;
};

const Layout = (props: CalendarLayoutProps) => {
  return (
    <div className="section overflow-visible touch-only:contents">
      <div className="flex flex-col gap-4 w-full">
        <div className="flex justify-between gap-4 my-6">
          <div className="text-3xl hidden md:block font-secondary">
            <b>Argentina 2025</b> — Schedule
          </div>
          <div className="text-sm rounded-md bg-[#74ACDF33] px-4 py-2 text-[#36364C]">
            This calendar is a work in progress and will change before
            Devconnect week. <b>Check back regularly for updates.</b>
            {/* <RichText content={data.pages.calendar_disclaimer} /> */}
          </div>
        </div>

        <ActionBar isCommunityCalendar={props.isCommunityCalendar} />

        <NewSchedule {...props} />
      </div>
    </div>
  );
};

export default Layout;
