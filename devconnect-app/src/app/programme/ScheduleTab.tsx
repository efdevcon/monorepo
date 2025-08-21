'use client';

import CalendarLayout from 'lib/components/event-schedule-new/layout';
import { useCalendarStore } from './tmp-state';

interface ProgrammeTabProps {
  atprotoEvents?: any[];
}

export default function ProgrammeTab({
  atprotoEvents = [],
}: ProgrammeTabProps) {
  const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } =
    useCalendarStore();

  return (
    <CalendarLayout
      isCommunityCalendar={false}
      selectedEvent={selectedEvent}
      selectedDay={selectedDay}
      setSelectedEvent={setSelectedEvent}
      setSelectedDay={setSelectedDay}
      events={atprotoEvents}
    />
  );
}
