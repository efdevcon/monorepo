-- Highlights share the announcements pipeline (same Notion DB, same sync):
-- type distinguishes the two behaviors. Announcements are time-first inbox
-- items (send_at ordering, unread state, push in Phase 2); highlights are
-- evergreen image cards on the home screen (curated by sort_order, never
-- pushed). image is the mirrored Supabase Storage URL — Notion attachment
-- URLs expire after ~1h so the sync copies them out (same pattern as the
-- ens-page links API).

alter table devcon8_announcements
  add column if not exists type text not null default 'announcement'
    check (type in ('announcement', 'highlight')),
  add column if not exists image text,
  add column if not exists sort_order integer not null default 0;
