"use client";

import { NativeRouter } from "@/native/NativeRouter";

// Import all client components
import { Home } from "@/components/home/Home";
import Speakers from "@/app/(page-layout)/speakers/speakers";
import Schedule from "@/app/(page-layout)/schedule/schedule";
import RoomScreens from "@/app/(page-layout)/room-screens/room-screens";
import RoomScreen from "@/app/(page-layout)/room-screens/[id]/room-screen";
import { SessionDetailsView } from "@/components/schedule/SessionDetailsView";
import { SpeakerDetailsContent } from "@/components/speakers/SpeakerDetailsContent";
import { useSpeakersData } from "@/components/speakers/useSpeakersData";
import { useSession } from "@/data/hooks";

/** Detail views resolve from the EventStore snapshot; nothing is fetched. */
function NativeSession({ id }: { id: string }) {
  const { session } = useSession(id);
  if (!session) return <div className="p-4 text-dc-muted">Session not found</div>;
  return <SessionDetailsView session={session} />;
}

function NativeSpeaker({ id }: { id: string }) {
  const { byId } = useSpeakersData();
  const decorated = byId.get(id);
  if (!decorated) return <div className="p-4 text-dc-muted">Speaker not found</div>;
  return <SpeakerDetailsContent decorated={decorated} />;
}

/**
 * Detail hrefs come in the in-app form (`/schedule?session=<id>`, from
 * detailHref) and the share form (`/schedule/<id>`); both render the detail.
 */
function detailId(url: URL, section: "schedule" | "speakers", param: "session" | "speaker") {
  const fromQuery = url.searchParams.get(param);
  if (url.pathname === `/${section}` && fromQuery) return fromQuery;
  const fromPath = new RegExp(`^/${section}/([^/]+)/?$`).exec(url.pathname);
  return fromPath ? decodeURIComponent(fromPath[1]) : null;
}

function renderRoute(href: string) {
  const url = new URL(href, "http://native.local");

  // Home
  if (url.pathname === "/") {
    return <Home />;
  }

  // Speakers
  const speakerId = detailId(url, "speakers", "speaker");
  if (speakerId) return <NativeSpeaker id={speakerId} />;
  if (url.pathname === "/speakers") {
    return <Speakers />;
  }

  // Schedule
  const sessionId = detailId(url, "schedule", "session");
  if (sessionId) return <NativeSession id={sessionId} />;
  if (url.pathname === "/schedule") {
    return <Schedule />;
  }

  // Room Screens
  if (url.pathname === "/room-screens") {
    return <RoomScreens />;
  }
  const roomMatch = url.pathname.match(/^\/room-screens\/(.+)$/);
  if (roomMatch) {
    return <RoomScreen id={roomMatch[1]} />;
  }

  // Fallback
  return <Home />;
}

export default function NativeApp() {
  return <NativeRouter>{renderRoute}</NativeRouter>;
}
