import { CuratedPlaylists } from "@/components/domain/archive/playlists/Curated";
import { getEvents } from "@/services/devcon";
import { DEVCON8_TRACKS } from "@/utils/config";
import slugify from "slugify";

export default async function Index() {
  const events = await getEvents();

  // Newest event first by date, so Devconnect ARG (2025) sits between
  // Devcon 8 and Devcon 7 rather than at the end (the API gives it edition 99).
  const ordered = [...events].sort(
    (a: any, b: any) => Date.parse(b.startDate) - Date.parse(a.startDate)
  );

  const devconPlaylists = ordered.map((event: any) => {
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

  // Devcon 8 tracks, each a Watch page filtered on the edition and the track.
  const trackPlaylists = DEVCON8_TRACKS.map((track) => {
    const id = slugify(track, { lower: true, strict: true });
    return {
      id,
      title: track,
      description: track,
      imageUrl: `/images/tracks/devcon8/${id}.png`,
      linkUrl: `/watch?event=devcon8&tags=${encodeURIComponent(track)}`,
      categories: [track],
      curators: ["Devcon team"],
      profiles: [],
      videos: [],
    };
  });

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
          title="Devcon 8 Tracks"
          items={trackPlaylists}
          eventList={false}
        />
      </div>
    </div>
  );
}
