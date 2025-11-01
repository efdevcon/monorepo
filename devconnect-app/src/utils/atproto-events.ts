import { apiResultToCalendarFormat } from 'lib/components/event-schedule-new/atproto-to-calendar-format';

export async function getAtprotoEvents() {
  try {
    const atprotoEvents = await fetch(
      process.env.NODE_ENV === 'development' && !process.env.FORCE_PROD_ENV
        ? 'https://at-slurper.onrender.com/calendar-events' // http://localhost:4000/calendar-events
        : 'https://at-slurper.onrender.com/calendar-events',
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    const atprotoEventsData = await atprotoEvents.json();

    const formattedAtprotoEvents = apiResultToCalendarFormat(atprotoEventsData);

    return formattedAtprotoEvents;
  } catch (error) {
    console.error(error);
    return [];
  }
}
