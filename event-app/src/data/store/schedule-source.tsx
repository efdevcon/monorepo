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
