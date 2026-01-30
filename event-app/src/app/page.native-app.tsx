"use client";

import { NativeRouter } from "@/native/NativeRouter";

// Import all client components
import { Menu } from "@/components/Menu";
import Speakers from "@/app/(page-layout)/speakers/speakers";
import Speaker from "@/app/(page-layout)/speakers/[id]/speaker";
import Schedule from "@/app/(page-layout)/schedule/schedule";
import Session from "@/app/(page-layout)/schedule/[id]/session";
import RoomScreens from "@/app/(page-layout)/room-screens/room-screens";
import RoomScreen from "@/app/(page-layout)/room-screens/[id]/room-screen";

function renderRoute(href: string) {
  // Home
  if (href === "/") {
    return <Menu />;
  }

  // Speakers
  if (href === "/speakers") {
    return <Speakers />;
  }
  const speakerMatch = href.match(/^\/speakers\/(.+)$/);
  if (speakerMatch) {
    return <Speaker id={speakerMatch[1]} />;
  }

  // Schedule
  if (href === "/schedule") {
    return <Schedule />;
  }
  const sessionMatch = href.match(/^\/schedule\/(.+)$/);
  if (sessionMatch) {
    return <Session id={sessionMatch[1]} />;
  }

  // Room Screens
  if (href === "/room-screens") {
    return <RoomScreens />;
  }
  const roomMatch = href.match(/^\/room-screens\/(.+)$/);
  if (roomMatch) {
    return <RoomScreen id={roomMatch[1]} />;
  }

  // Fallback
  return <Menu />;
}

export default function NativeApp() {
  return <NativeRouter>{renderRoute}</NativeRouter>;
}
