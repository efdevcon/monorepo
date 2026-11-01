"use client";

import { createContext, useContext, type ReactNode } from "react";
import { eventStore, type EventStore } from "./event-store";
import { hubStore } from "./hub-store";

/**
 * Which programme the data hooks read: the Pretalx schedule ("main", the
 * default everywhere) or the Community Hubs' sheets ("hubs"). The Schedule
 * tab wraps its list in the provider so every hook underneath (sessions,
 * rooms, filters, cards) follows the selected segment without knowing.
 */
export type ScheduleSource = "main" | "hubs";

export const HUBS_PARAM = "hubs";
/** `/schedule?interests=1` opens the schedule with My Interests on (the AI planner's apply page links it). */
export const INTERESTS_PARAM = "interests";
/**
 * `/schedule?room=<id>[,<id>]` opens the schedule with those rooms in the
 * Locations filter: Pretalx room ids (the slug of the Pretalx name, e.g.
 * `lotus-stage-1`, `main-stage-lotus`), never display names, which the app
 * renames (venueRooms.ts). Unknown ids are ignored. The filter panel keeps
 * the param in step so a filtered view can be shared (2026-11-01).
 */
export const ROOM_PARAM = "room";
/**
 * `/schedule?day=<n>` opens the schedule on the n-th day of the programme
 * (1-based), `?day=all` on the All tab; a `YYYY-MM-DD` venue-day key works
 * too. The day tabs write the number back (resolveDayParam / dayParamValue
 * in schedule/utils.ts).
 */
export const DAY_PARAM = "day";
/**
 * `/schedule?community=<key>[,<key>]` opens the Community programme with those
 * hubs / community-led groups in the Communities filter, by the facet's own
 * keys: `hub:<id>` (communityHubs.ts) or `cls:<id>` (communityLed.ts), e.g.
 * `cls:ethindia`, `hub:india`. Implies `?hubs=1`. A community-led pick without
 * `?day=` lands on the first day the group runs, as the panel's chips do.
 */
export const COMMUNITY_PARAM = "community";

const ScheduleSourceContext = createContext<ScheduleSource>("main");

export function ScheduleSourceProvider({ source, children }: { source: ScheduleSource; children: ReactNode }) {
  return <ScheduleSourceContext.Provider value={source}>{children}</ScheduleSourceContext.Provider>;
}

export function useScheduleSource(): ScheduleSource {
  return useContext(ScheduleSourceContext);
}

export function storeFor(source: ScheduleSource): EventStore {
  return source === "hubs" ? hubStore : eventStore;
}
