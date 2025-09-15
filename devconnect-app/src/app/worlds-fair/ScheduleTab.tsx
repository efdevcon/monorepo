'use client';

import { default as Layout } from 'lib/components/event-schedule-new/layout-app';
import { useCalendarStore } from './tmp-state';
import { Separator } from 'lib/components/ui/separator';
import cn from 'classnames';
import css from './schedule-tab.module.scss';

interface ScheduleTabProps {
  atprotoEvents?: any[];
}

export default function ScheduleTab({ atprotoEvents = [] }: ScheduleTabProps) {
  const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } =
    useCalendarStore();

  return (
    <div className={cn('text-left touch-only:px-0 p-4', css['schedule-tab'])}>
      <Layout
        isCommunityCalendar={false}
        selectedEvent={selectedEvent}
        selectedDay={selectedDay}
        setSelectedEvent={setSelectedEvent}
        setSelectedDay={setSelectedDay}
        events={atprotoEvents.filter((event: any) => event.isCoreEvent)}
      />
      <Separator className="my-4 mx-4 w-full" />
      <Layout
        isCommunityCalendar={true}
        selectedEvent={selectedEvent}
        selectedDay={selectedDay}
        setSelectedEvent={setSelectedEvent}
        setSelectedDay={setSelectedDay}
        events={atprotoEvents.filter((event: any) => !event.isCoreEvent)}
      />
    </div>
  );
}
