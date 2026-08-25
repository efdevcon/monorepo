-- The home screen's "Featured" hero card was hardcoded in the app (a committed
-- webp plus a literal title/URL), which meant the most prominent card on the
-- home page was the one thing editors could not change without a deploy. It is
-- really just a highlight with a bigger treatment, so this lets one highlight
-- be marked as the featured one from Notion (a Featured checkbox on the same
-- DB), instead of a separate hardcoded component.
--
-- Additive and defaulted, so the currently deployed code — which never selects
-- or writes this column — keeps working untouched.
alter table devcon8_announcements
  add column if not exists featured boolean not null default false;

-- At most one row should win, but a checkbox per row cannot enforce that in
-- Notion, so the app picks deterministically (featured flag, else the last
-- highlight by sort_order). This partial index just makes that lookup cheap
-- and documents the intent.
create index if not exists devcon8_announcements_featured_idx
  on devcon8_announcements (featured)
  where featured;
