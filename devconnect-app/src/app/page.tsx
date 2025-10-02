import HomePageContent from './page-content';
import { getAtprotoEvents } from './worlds-fair/page';

export default async function HomePage() {
  const atprotoEvents = await getAtprotoEvents();

  return <HomePageContent atprotoEvents={atprotoEvents} />;
}
