import HomePageContent from './page-content';
import { getAtprotoEvents } from '@/utils/atproto-events';

export default async function HomePage() {
  const atprotoEvents = await getAtprotoEvents();

  return <HomePageContent atprotoEvents={atprotoEvents} />;
}
