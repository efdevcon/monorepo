"use client";

import { useAnnouncements } from "./useAnnouncements";
import { useSessionReminders } from "@/data/reminders/useSessionReminders";

/**
 * The header's Announcements badge: unread Event announcements plus unread
 * Personal session reminders. Summed, never compared — the two run on
 * different clocks (real-world vs event time).
 */
export function useInboxUnreadCount(enabled = true): number {
  const { unreadCount: event } = useAnnouncements({ enabled });
  const { unreadCount: personal } = useSessionReminders({ enabled });
  return event + personal;
}
