"use client";

import APP_CONFIG from "@/CONFIG";
import { useSessions, useSpeakers, useRooms } from "@/data/hooks";
import { useWarmImages } from "@/data/hooks/use-warm-images";
import { useAnnouncements } from "@/data/announcements/useAnnouncements";
import { useTickets } from "@/data/tickets/useTickets";
import { supportersData } from "@/data/supporters";
import { APP_IMAGES, MAP_IMAGES, TRACK_GEM_IMAGES } from "@/data/appImages";

/** Supporter logos ship as a static file, so they're known without a fetch. */
const SUPPORTER_LOGOS = Object.values(supportersData).flatMap((supporter) => [
  supporter.logo,
  (supporter as { largeLogo?: string }).largeLogo,
]);

/**
 * Subscribes to the core datasets (sessions, speakers, rooms) once, app-wide, so
 * they're fetched during any online session and persisted to the Dexie-backed
 * SWR cache. Because the detail/by-X hooks now derive from these lists, warming
 * them makes every list and detail page available offline after a single online
 * visit — no matter which page the user happened to open.
 *
 * Then warms the images those datasets render — speaker avatars, session images,
 * supporter logos, highlight and featured images — because caching the data
 * without its images was the half of "works offline" that didn't hold: the
 * speakers page came up complete but as a grid of blank circles.
 *
 * Scoped to the active dataset (the hooks are keyed on it), incremental (only
 * what the cache is missing), skipped on metered/slow connections, and chunked
 * at idle so it never blocks browsing. See `useWarmImages`.
 *
 * Renders nothing. SWR dedupes, so this is effectively free alongside the pages
 * that already read the same keys.
 */
export function CacheWarmer() {
  const { sessions } = useSessions();
  const { speakers } = useSpeakers();
  useRooms();

  // Also warms the announcements payload itself, which was previously only
  // fetched by visiting the home or announcements page.
  const { highlights, featured } = useAnnouncements({
    enabled: APP_CONFIG.ANNOUNCEMENTS_ENABLED,
  });

  // Swag photos render as soon as tickets load on the home page, but warm them
  // too so they're cached even if the user only opened another page online.
  // Null key while signed out, so this costs nothing for visitors.
  const { tickets } = useTickets();
  const swagImages = tickets.flatMap((order) =>
    order.tickets.flatMap((ticket) => [
      ticket.imageUrl,
      ...(ticket.addons ?? []).map((addon) => addon.imageUrl),
    ])
  );

  // Priority order, most important first. Avatars are last on purpose: 645 of
  // them dwarf everything else, and any single one matters least.
  useWarmImages([
    // Gems first: nine small files that every schedule view renders, and the
    // schedule is where offline use concentrates.
    TRACK_GEM_IMAGES,
    // Then the venue map background: the map is the other core offline view.
    MAP_IMAGES,
    [featured?.image, ...highlights.map((highlight) => highlight.image)],
    swagImages,
    APP_IMAGES,
    SUPPORTER_LOGOS,
    sessions.map((session) => session.image),
    speakers.map((speaker) => speaker.avatar),
  ]);

  return null;
}
