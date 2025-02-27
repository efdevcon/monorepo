import { Interests } from "@/components/domain/archive/interests";
import { FeaturedList } from "@/components/domain/archive/playlists/Featured";
import { Editions } from "@/components/domain/archive/Editions";
import { getEvents } from "@/services/devcon";

export default async function Home() {
  const events = await getEvents();

  return (
    <>
      <Interests />

      <FeaturedList title="Devcon 7 Opening" type="devcon-7-opening" />

      <FeaturedList title="Keynotes" type="devcon-7" />

      <Editions events={events.reverse()} />

      <FeaturedList title="Devcon 6 Highlights" type="devcon-6" />
    </>
  );
}
