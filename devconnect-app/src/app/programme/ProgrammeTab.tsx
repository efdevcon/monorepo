'use client';

import NewScheduleIndex from 'lib/components/event-schedule-new';

interface ProgrammeTabProps {
  atprotoEvents?: any[];
}

export default function ProgrammeTab({
  atprotoEvents = [],
}: ProgrammeTabProps) {
  return (
    <NewScheduleIndex
      selectedEvent={null}
      selectedDay={null}
      setSelectedEvent={() => {}}
      setSelectedDay={() => {}}
      events={atprotoEvents}
    />
  );
}
