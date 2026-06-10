"use client";

import { useSessions, useSpeakers, useRooms } from "@/data/hooks";

/**
 * Subscribes to the core datasets (sessions, speakers, rooms) once, app-wide, so
 * they're fetched during any online session and persisted to the Dexie-backed
 * SWR cache. Because the detail/by-X hooks now derive from these lists, warming
 * them makes every list and detail page available offline after a single online
 * visit — no matter which page the user happened to open.
 *
 * Renders nothing. SWR dedupes, so this is effectively free alongside the pages
 * that already read the same keys.
 */
export function CacheWarmer() {
  useSessions();
  useSpeakers();
  useRooms();
  return null;
}
