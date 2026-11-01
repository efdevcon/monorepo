/** One row as served by /api/announcements: an inbox item or a highlight. */
export interface Announcement {
  /** Notion page id — stable across edits, also the read-state key. */
  id: string;
  /** "announcement" = inbox item, "highlight" = home-screen image card. */
  type: "announcement" | "highlight";
  title: string;
  message: string;
  /** Optional deep link (internal path or absolute URL). */
  url: string | null;
  /** Mirrored image URL (highlights); null for plain announcements. */
  image: string | null;
  /** ISO timestamp; announcements are hidden from the feed until this time. */
  sendAt: string;
  /** Manual ordering for highlights (ascending). */
  sortOrder: number;
  /**
   * Marks the one highlight rendered as the home-screen hero. Always false for
   * announcements (the sync forces it), so only a highlight can win.
   */
  featured: boolean;
}

export interface AnnouncementsResponse {
  success: boolean;
  data?: { announcements: Announcement[] };
  error?: string;
}

/** A row dated after now, as `GET /api/announcements/status` lists it (team only). */
export interface UpcomingAnnouncement {
  id: string;
  title: string;
  /** ISO timestamp: when it appears in the inbox (and pushes, if armed). */
  sendAt: string;
  /** The Notion checkboxes as last synced. */
  visible: boolean;
  push: boolean;
  /** The row's push state: "scheduled" means the dispatcher will send it at sendAt. */
  status: string;
  /** Armed or finished test sends by audience ("scheduled" | "sending" | "sent"). */
  tests: { team?: string; product?: string };
}

/**
 * The feed's sync state for the EF internal tools: `syncedAt` is the last
 * time the Notion sync wrote the table (every sync touches every row),
 * `version` is `<syncedAt ms>-<row count>` in the Community Hubs bundle
 * style, `upcoming` the announcements dated after now, soonest first.
 */
export interface AnnouncementsStatus {
  syncedAt: string | null;
  version: string | null;
  count: number;
  upcoming: UpcomingAnnouncement[];
}
