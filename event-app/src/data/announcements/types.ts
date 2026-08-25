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
