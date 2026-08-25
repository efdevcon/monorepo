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
export const APP_IMAGES: string[] = [
  // Large — warmed, never precached.
  "/login/backdrop.jpg",
  "/tickets-hero.jpg",
  "/home/tickets-banner.webp",
  // Small chrome — precached too, listed here so a cache miss still self-heals.
  "/login/devcon-8-logo.svg",
  "/schedule/devcon8-logo.svg",
  "/schedule/devcon8-logomark.svg",
  "/schedule/empty-search.webp",
  "/partners/ens.png",
];
