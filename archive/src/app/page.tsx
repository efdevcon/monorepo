import { Interests } from "@/components/domain/archive/interests";
import { FeaturedList } from "@/components/domain/archive/playlists/Featured";
import { Editions } from "@/components/domain/archive/Editions";
import { getEvents } from "@/services/devcon";

export default async function Home() {
  const events = await getEvents();

  return (
    <>
      <Interests />

      {/* Devcon 8 rows build themselves from the schedule as recordings are
          published: the opening block on the Main Stage, then the sessions
          marked featured in Pretalx (no hand-picked lists yet). */}
      <FeaturedList title="Devcon 8 Opening" type="devcon-8-opening" />

      <FeaturedList title="Devcon 8 Keynotes" type="devcon-8" />

      <Editions events={events} />

      <FeaturedList title="Devcon 7 Keynotes" type="devcon-7" />

      <FeaturedList title="Most Watched" type="most-popular" />
    </>
  );
}
