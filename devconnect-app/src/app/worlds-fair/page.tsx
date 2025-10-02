import ProgrammePageContent from './page-content';
import { getAtprotoEvents } from '@/utils/atproto-events';

export default async function ProgrammePage() {
  const atprotoEvents = await getAtprotoEvents();
  return <ProgrammePageContent atprotoEvents={atprotoEvents} />;
}
