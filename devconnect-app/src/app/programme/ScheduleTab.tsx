'use client';

import { useEffect, useState } from 'react';
import moment from 'moment';
import NewScheduleIndex from 'lib/components/event-schedule-new';

interface ScheduleTabProps {
  // Remove atprotoEvents prop since we'll fetch it internally
}

async function getAtprotoEvents() {
  try {
    const atprotoEvents = await fetch(
      process.env.NODE_ENV === 'development' && false
        ? 'http://localhost:4000/calendar-events'
        : 'https://at-slurper.onrender.com/calendar-events'
    );

    if (!atprotoEvents.ok) {
      throw new Error(`Failed to fetch events: ${atprotoEvents.status}`);
    }

    const atprotoEventsData = await atprotoEvents.json();
    // console.log(atprotoEventsData)

    const formattedAtprotoEvents = atprotoEventsData.map((event: any) => {
      const record = event.record_passed_review;

      const timeblocks = [];

      if (record.start_utc) {
        let startDate = moment.utc(record.start_utc);
        let endDate;

        if (record.end_utc) {
          endDate = moment.utc(record.end_utc).format('YYYY-MM-DDTHH:mm:ss[Z]');
        } else {
          endDate = startDate.format('YYYY-MM-DDTHH:mm:ss[Z]');
        }

        timeblocks.push({
          start: startDate.format('YYYY-MM-DDTHH:mm:ss[Z]'),
          end: endDate,
        });
      }

      const manualOverrides = {} as any;

      if (event.id.toString() === '23') {
        manualOverrides.priority = 1;
        manualOverrides.spanRows = 2;
      }

      if (event.id.toString() === '22') {
        manualOverrides.priority = 2;
        manualOverrides.spanRows = 3;
      }

      return {
        id: event.id,
        name: record.title,
        description: record.description,
        startDate: record.start_utc,
        endDate: record.end_utc,
        location: record.location.name,
        difficulty: record.expertise,
        organizer: record.organizer.name,
        timeblocks: timeblocks,
        ...manualOverrides,
        // difficulty: record.difficulty,
      };
    });

    return formattedAtprotoEvents;
  } catch (error) {
    console.error('Error fetching atproto events:', error);
    return [];
  }
}

export default function ScheduleTab({}: ScheduleTabProps) {
  const [atprotoEvents, setAtprotoEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const events = await getAtprotoEvents();
      setAtprotoEvents(events);
      setLoading(false);
    };

    fetchEvents();
  }, []);

  if (loading) {
    return <div className="py-8 text-center">Loading schedule...</div>;
  }

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
