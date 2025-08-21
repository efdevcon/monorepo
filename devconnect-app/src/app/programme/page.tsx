import moment from 'moment';
import ProgrammePageContent from './page-content';

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
        name: record.title || 'Untitled Event',
        description: record.description || '',
        startDate: record.start_utc,
        endDate: record.end_utc,
        location: record.location?.name || 'Unknown Location',
        difficulty: record.expertise || 'Beginner',
        organizer: record.organizer?.name || 'Unknown Organizer',
        timeblocks: timeblocks,
        eventType: record.event_type || 'Other',
        isCoreEvent: event.is_core_event || false,
        eventLink: record.main_url || '',
        categories: [], // Add this line to fix the filter error
        priority: 0, // Add default priority
        ...manualOverrides,
      };
    });

    return formattedAtprotoEvents;
  } catch (error) {
    console.error('Error fetching atproto events:', error);
    return [];
  }
}

export default async function ProgrammePage() {
  const atprotoEvents = await getAtprotoEvents();
  return <ProgrammePageContent atprotoEvents={atprotoEvents} />;
}
