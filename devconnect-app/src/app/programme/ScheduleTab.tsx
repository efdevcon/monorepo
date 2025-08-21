'use client';

import { useEffect, useState } from 'react';
import CalendarLayout from 'lib/components/event-schedule-new/layout';
import { useCalendarStore } from './tmp-state';

interface ProgrammeTabProps {
  atprotoEvents?: any[];
}

export default function ProgrammeTab({
  atprotoEvents = [],
}: ProgrammeTabProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const { selectedEvent, selectedDay, setSelectedEvent, setSelectedDay } =
    useCalendarStore();

  // Ensure hydration is complete before rendering
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Show loading state during SSR/hydration
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

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
