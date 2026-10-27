"use client";

import { mapHrefForRoom as mapHrefForRoomNext } from "@/app/(page-layout)/map/venue-map/data/roomAreas";
import { mapHrefForRoom as mapHrefForRoomPrototype } from "@/app/(page-layout)/map/venue-map-3d/roomAreas";
import { useReleased } from "@/data/release/releaseGates";

/**
 * `/map?area=…` for a schedule room, built for whichever map the Map tab
 * shows (MapPane.tsx): the rebuilt JWCC map behind `venueMapNext`, else the
 * prototype. The two keep different footprint keys, so a link built for one
 * highlights nothing on the other (the session details and reminder cards
 * carried the prototype's keys until 2026-10-27; Scott). Pure builders live
 * beside each map in its `roomAreas.ts`; this hook only picks one.
 */
export function useMapHrefForRoom(roomId: string | null | undefined): string {
  const next = useReleased("venueMapNext");
  return next ? mapHrefForRoomNext(roomId) : mapHrefForRoomPrototype(roomId);
}
