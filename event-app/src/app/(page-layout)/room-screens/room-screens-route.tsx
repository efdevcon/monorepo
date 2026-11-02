"use client";

import { usePathname } from "next/navigation";
import { RoomScreen } from "@/components/room-screen";
import { parseKioskPath } from "@/routing/viewParams";
import RoomScreens from "./room-screens";

/**
 * The /room-screens shell: the picker, or one room's kiosk when the URL is
 * /room-screens/<id>. Online that URL is served by its own page; offline the
 * worker answers it with this precached shell (sw.ts, shellForPath), so a TV
 * that reloads without network still boots its room from the local store,
 * exactly like the detail paths do. Reads the URL, never the route params.
 */
export default function RoomScreensRoute() {
  const pathname = usePathname();
  const kioskId = parseKioskPath(pathname);
  return kioskId ? <RoomScreen roomId={kioskId} /> : <RoomScreens />;
}
