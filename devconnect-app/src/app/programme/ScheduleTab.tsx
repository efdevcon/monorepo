'use client';

import { default as Layout } from 'lib/components/event-schedule-new/layout';
import { useCalendarStore } from './tmp-state';

interface ScheduleTabProps {
  atprotoEvents?: any[];
}

export default function ScheduleTab({ atprotoEvents = [] }: ScheduleTabProps) {
  const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } =
    useCalendarStore();

  return (
    <Layout
      isCommunityCalendar={false}
      selectedEvent={selectedEvent}
      selectedDay={selectedDay}
      setSelectedEvent={setSelectedEvent}
      setSelectedDay={setSelectedDay}
      events={atprotoEvents}
    />
  );
}
