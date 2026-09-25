"use client";

import { useAnnouncements } from "./useAnnouncements";
import { useSessionReminders } from "@/data/reminders/useSessionReminders";

/**
 * The header's Announcements badge: unread team announcements plus unread
 * session reminders. Summed, never compared — the two run on different
 * clocks (real-world vs event time).
 */
export function useInboxUnreadCount(enabled = true): number {
  const { unreadCount: announcements } = useAnnouncements({ enabled });
  const { unreadCount: reminders } = useSessionReminders({ enabled });
  return announcements + reminders;
}
