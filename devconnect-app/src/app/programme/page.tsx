import moment from 'moment';
import ProgrammePageContent from './page-content';
import { apiResultToCalendarFormat } from 'lib/components/event-schedule-new/atproto-to-calendar-format';

async function getAtprotoEvents() {
  try {
    const atprotoEvents = await fetch(
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:4000/calendar-events'
        : 'https://at-slurper.onrender.com/calendar-events'
    );

    const atprotoEventsData = await atprotoEvents.json();

    const formattedAtprotoEvents = apiResultToCalendarFormat(atprotoEventsData);

    return formattedAtprotoEvents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function ProgrammePage() {
  const atprotoEvents = await getAtprotoEvents();
  return <ProgrammePageContent atprotoEvents={atprotoEvents} />;
}
