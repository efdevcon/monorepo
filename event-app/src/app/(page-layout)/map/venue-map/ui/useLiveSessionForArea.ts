"use client";

import { useMemo } from "react";
import type { Session } from "@/data/models";
import { useSessions } from "@/data/hooks";
import { useNowMs } from "@/hooks/useNow";
import { getStatus } from "@/components/schedule/utils";
import type { Area } from "../data/resolve";

/**
 * The session running right now in a schedule room behind a footprint (null
 * when it has no room, or nothing is on). Reads the synced store and the
 * mockable clock, so `?mockNow=` drives it like the schedule. A Lotus hall
 * lists its own room and the combined Main Stage room.
 */
export function useLiveSessionForArea(area: Area | null): Session | null {
  const { sessions } = useSessions();
  const nowMs = useNowMs(60_000);
  return useMemo(() => {
    const roomIds = area?.roomIds ?? [];
    return roomIds.length ? sessions.find((s) => roomIds.includes(s.room?.id ?? "") && getStatus(s, nowMs) === "live") ?? null : null;
  }, [area, sessions, nowMs]);
}
