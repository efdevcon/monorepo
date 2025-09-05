'use client';

import { default as Layout } from 'lib/components/event-schedule-new/layout-app';
import { useCalendarStore } from './tmp-state';
import { Separator } from 'lib/components/ui/separator';

interface ScheduleTabProps {
  atprotoEvents?: any[];
}

export default function ScheduleTab({ atprotoEvents = [] }: ScheduleTabProps) {
  const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } =
    useCalendarStore();

  return (
    <div className="text-left p-4">
      <Layout
        isCommunityCalendar={false}
        selectedEvent={selectedEvent}
        selectedDay={selectedDay}
        setSelectedEvent={setSelectedEvent}
        setSelectedDay={setSelectedDay}
        events={atprotoEvents.filter((event: any) => event.isCoreEvent)}
      />
      <Separator className="my-4" />
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
