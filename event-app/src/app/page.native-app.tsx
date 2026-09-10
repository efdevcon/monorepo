"use client";

import { NativeRouter } from "@/native/NativeRouter";

// Import all client components
import { Home } from "@/components/home/Home";
import Speakers from "@/app/(page-layout)/speakers/speakers";
import Schedule from "@/app/(page-layout)/schedule/schedule";
import RoomScreens from "@/app/(page-layout)/room-screens/room-screens";
import RoomScreen from "@/app/(page-layout)/room-screens/[id]/room-screen";
import Session from "@/app/(page-layout)/schedule/[id]/session";
import Speaker from "@/app/(page-layout)/speakers/[id]/speaker";
import { parseDetailPath } from "@/routing/viewParams";

/**
 * Detail pages resolve from the EventStore snapshot; nothing is fetched.
 * Hrefs are the web app's (`/schedule/<id>`, `/speakers/<id>`, from
 * detailHref).
 */
function renderRoute(href: string) {
  const url = new URL(href, "http://native.local");

  // Home
  if (url.pathname === "/") {
    return <Home />;
  }

  const detail = parseDetailPath(url.pathname);
  if (detail?.kind === "speaker") return <Speaker id={detail.id} />;
  if (detail?.kind === "session") return <Session id={detail.id} />;

  if (url.pathname === "/speakers") {
    return <Speakers />;
  }
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
