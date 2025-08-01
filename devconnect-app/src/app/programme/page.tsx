import moment from 'moment';
import PageLayout from '@/components/PageLayout';
import TabbedSection from '@/components/TabbedSection';
import ProgrammeTab from './ProgrammeTab';
import WorldsFairTab from './WorldsFairTab';
import FavoritesTab from './FavoritesTab';
import { NAV_ITEMS } from '@/config/nav-items';

const navItem = NAV_ITEMS.find((item) => item.href === '/programme');
const navLabel = navItem?.label || 'Programme';
const title = navLabel;

const tabComponents = [ProgrammeTab, WorldsFairTab, FavoritesTab];

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

export default async function ProgrammePage() {
  // Fetch data at build time
  const atprotoEvents = await getAtprotoEvents();

  return (
    <div className="flex w-full flex-col overflow-hidden ">
      <div className="section overflow-visible mt-8 touch-only:!contents">
        <ProgrammeTab atprotoEvents={atprotoEvents} />
      </div>
    </div>
    // <PageLayout title={title}>
    //   <TabbedSection navLabel={navLabel}>
    //     {(tabIndex) => {
    //       const TabComponent =
    //         tabComponents[tabIndex] || (() => <div>Not found</div>);
    //       return <TabComponent atprotoEvents={atprotoEvents} />;
    //     }}
    //   </TabbedSection>
    // </PageLayout>
  );
}
