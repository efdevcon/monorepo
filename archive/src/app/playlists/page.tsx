import { CuratedPlaylists } from "@/components/domain/archive/playlists/Curated";
import { getEvents } from "@/services/devcon";
import { TRACKS } from "@/utils/config";
import slugify from "slugify";

export default async function Index() {
  const events = await getEvents();

  const devconPlaylists = events.map((event: any) => {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      imageUrl: `/images/events/${event.id}.png`,
      categories: ["Devcon"],
      curators: ["Devcon team"],
      profiles: [],
      videos: [],
      nrOfSessions: event.nrOfSessions,
    };
  });

  const trackPlaylists = TRACKS.filter((track) => track !== "Devcon").map(
    (track) => {
      const id = slugify(track, { lower: true });
      return {
        id,
        title: track,
        description: track,
        imageUrl: `/images/tracks/${id}.png`,
        categories: [track],
        curators: ["Devcon team"],
        profiles: [],
        videos: [],
      };
    }
  );

  return (
    <div className="">
      <div className="padding-bottom">
        <CuratedPlaylists
          borderless={true}
          title="Devcon"
          items={devconPlaylists}
          eventList={true}
        />
      </div>

      <div className="padding-bottom">
        <CuratedPlaylists
          borderless={false}
          title="Tracks"
          items={trackPlaylists}
          eventList={false}
        />
      </div>
    </div>
  );
}
