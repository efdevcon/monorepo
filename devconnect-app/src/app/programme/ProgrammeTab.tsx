'use client';

import NewSchedule from 'lib/components/event-schedule-new';

interface ProgrammeTabProps {
  atprotoEvents?: any[];
}

export default function ProgrammeTab({
  atprotoEvents = [],
}: ProgrammeTabProps) {
  return (
    <NewSchedule
      selectedEvent={null}
      selectedDay={null}
      setSelectedEvent={() => {}}
      setSelectedDay={() => {}}
      events={atprotoEvents}
    />
  );
}
