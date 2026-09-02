import { DC8_TRACKS } from "@/components/schedule/trackTheme";
import mapBackground from "@/app/(page-layout)/map/venue-map/bg-image-new.png";

/**
 * Static images shipped in `public/` and rendered by the app shell.
 *
 * These are same-origin, so they never appeared in the warm list built from API
 * data — which is why they were the one category that stayed broken after a
 * connection came back. Listed here so `CacheWarmer` treats them like any other
 * image.
 *
 * The small chrome (logos, logomark, empty-state art) is *also* in
 * `additionalPrecacheEntries` in next.config.ts, so it's available from the very
 * first offline paint. The large ones below are deliberately warm-only: the
 * login backdrop alone is 1.4MB and precaching it would bloat the SW install for
 * every device (see the precache sizing history in docs/architecture.md).
 */
/**
 * Track gem artwork (public/schedule/gems/*.webp), derived from the canonical
 * track list so a new track is warmed automatically. Rendered lazily in every
 * session card, timeline block and filter chip, so without warming only the
 * tracks that scrolled into view online were cached; a track never seen online
 * showed an empty square offline. Also precached (next.config.ts) so they are
 * there on the first offline paint; listed here so a cache miss self-heals,
 * like the small chrome below.
 */
export const TRACK_GEM_IMAGES: string[] = DC8_TRACKS.flatMap((track) =>
  track.gem ? [track.gem] : []
);

/**
 * Venue map background (a static import, so its URL is hashed and lives under
 * /_next/static/media rather than public/). Rendered as a plain <img> in
 * VenueMap.tsx precisely so this single URL is what the browser requests and
 * what gets warmed; the map SVG itself is inlined in the JS bundle.
 */
export const MAP_IMAGES: string[] = [mapBackground.src];

export const APP_IMAGES: string[] = [
  // Large — warmed, never precached.
  "/login/backdrop.jpg",
  "/tickets-hero.jpg",
  "/home/tickets-banner.webp",
  "/login/signin-keyart.webp",
  // Small chrome — precached too, listed here so a cache miss still self-heals.
  "/login/devcon-8-logo.svg",
  "/schedule/devcon8-logo.svg",
  "/schedule/devcon8-logomark.svg",
  "/schedule/empty-search.webp",
  "/partners/ens.png",
];
