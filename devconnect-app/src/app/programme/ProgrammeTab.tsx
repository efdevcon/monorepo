'use client';

// import NewScheduleIndex from 'lib/components/event-schedule-new';

interface ProgrammeTabProps {
  atprotoEvents?: any[];
}

export default function ProgrammeTab({
  atprotoEvents = [],
}: ProgrammeTabProps) {
  return (
    <div>
      <h2>Programme Tab</h2>
      <p>Event schedule temporarily disabled due to import issues.</p>
      <p>Events count: {atprotoEvents.length}</p>
    </div>
    // <NewScheduleIndex
    //   selectedEvent={null}
    //   selectedDay={null}
    //   setSelectedEvent={() => {}}
    //   setSelectedDay={() => {}}
    //   events={atprotoEvents}
    // />
  );
}
