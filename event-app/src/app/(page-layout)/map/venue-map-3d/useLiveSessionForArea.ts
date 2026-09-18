"use client";

import { useMemo } from "react";
import type { Session } from "@/data/models";
import { useSessions } from "@/data/hooks";
import { useNowMs } from "@/hooks/useNow";
import { getStatus } from "@/components/schedule/utils";
import { roomIdForArea } from "./roomAreas";

/**
 * The session running right now in the schedule room behind a map footprint
 * (null when the footprint has no room, or nothing is on). Reads the synced
 * store and the mockable clock, so `?mockNow=` drives it like the schedule.
 */
export function useLiveSessionForArea(areaKey: string | null): Session | null {
  const roomId = areaKey ? roomIdForArea(areaKey) : null;
  const { sessions } = useSessions(roomId ? { roomId } : undefined);
  const nowMs = useNowMs(60_000);
  return useMemo(
    () => (roomId ? sessions.find((s) => getStatus(s, nowMs) === "live") ?? null : null),
    [roomId, sessions, nowMs]
  );
}
