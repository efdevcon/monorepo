import { spawnSync } from "node:child_process";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isStaticExport = process.env.STATIC_EXPORT === "true";

// Revision string for the cache-bust key of additionalPrecacheEntries.
// When HEAD changes, the SW refetches the entries on next install.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" })
    .stdout?.trim() || crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development" || isStaticExport,
  cacheOnNavigation: false,
  // Precache the app-shell routes so they boot offline / on first launch, even
  // cold (before any online navigation warms the runtime cache). These are just
  // light client shells — all data is fetched at runtime via SWR/Dexie — so the
  // HTML is cheap to precache. Covers every static nav destination; dynamic
  // detail routes (/schedule/[id], /speakers/[id], …) rely on runtime RSC
  // caching + the document fallback instead.
  additionalPrecacheEntries: [
    { url: "/", revision },
    { url: "/schedule", revision },
    { url: "/speakers", revision },
    { url: "/map", revision },
    { url: "/announcements", revision },
    // Ticket QR must work at the venue entrance with no signal: the ticket data
    // is already Dexie-cached and the QR is generated client-side from the
    // secret, so only this shell was missing — without it an offline attendee
    // got the offline fallback instead of their ticket.
    { url: "/ticket", revision },
    { url: "/room-screens", revision },
    // NOTE: only list routes that actually exist. A single 404 here fails the
    // SW install event on every device (the worker never activates, offline
    // breaks, and pushManager waits forever) — this bit us when /profile and
    // /login were precached after their pages were removed.
    // Offline fallback served by the SW when a document navigation can't be
    // fulfilled offline (see `fallbacks` in src/sw.ts).
    { url: "/offline", revision },
    // App-shell images + the PWA manifest. Small on purpose (~37KB total): these
    // are the assets visible on the very first offline paint, before any runtime
    // caching has happened. The manifest was previously handled by no SW rule at
    // all (its request destination is "manifest", not "image"), so it failed on
    // every offline load. Large art (login/backdrop.jpg at 1.4MB, tickets-hero,
    // tickets-banner) is deliberately excluded and warmed at runtime instead —
    // see APP_IMAGES in src/data/appImages.ts.
    // Every file here MUST exist, per the note above.
    { url: "/manifest.webmanifest", revision },
    { url: "/schedule/devcon8-logomark.svg", revision },
    { url: "/schedule/devcon8-logo.svg", revision },
    { url: "/login/devcon-8-logo.svg", revision },
    { url: "/schedule/empty-search.webp", revision },
    { url: "/partners/ens.png", revision },
    // Track gem artwork (~113KB for all nine): every schedule view renders
    // them and the schedule is where offline use concentrates, so they must be
    // there on the first offline paint regardless of connection quality (the
    // runtime warmer skips data-saver / 2G). Also in TRACK_GEM_IMAGES
    // (src/data/appImages.ts) so a cache miss self-heals. Paths mirror
    // DC8_TRACKS in src/components/schedule/trackTheme.ts: renaming a file
    // without updating this list breaks the SW install everywhere (see above).
    { url: "/schedule/gems/applied-cryptography.webp", revision },
    { url: "/schedule/gems/core-protocol.webp", revision },
    { url: "/schedule/gems/futures-worth-building.webp", revision },
    { url: "/schedule/gems/open-verifiable-stack.webp", revision },
    { url: "/schedule/gems/permissionless-networks.webp", revision },
    { url: "/schedule/gems/privacy-consent.webp", revision },
    { url: "/schedule/gems/rights-freedoms-governance.webp", revision },
    { url: "/schedule/gems/security.webp", revision },
    { url: "/schedule/gems/users-builders-agents.webp", revision },
  ],
  reloadOnOnline: false,
  exclude: [
    /build-manifest\.json$/,
    /react-loadable-manifest\.json$/,
    /middleware-manifest\.json$/,
    /\/server\//,
    // Match app/api/... AND app/(group)/api/... so route groups don't slip through
    /\/app\/(?:\([^)]+\)\/)?api\//,
    /\/route-[a-f0-9]+\.js$/,
  ],
});

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["lib"],
  experimental: {
    // Keep prefetched route payloads in the client router cache for the whole
    // session (default 5 min). Every tab is a static one-line shell — all data
    // is client-side via SWR/Dexie — so re-fetching the RSC payload on a tab
    // switch only ever added a network round-trip (and, through the service
    // worker's NetworkFirst rule, a stall on bad wifi).
    staleTimes: { static: 3600 },
  },
  // Short detail URLs (`/schedule/<id>`, `/speakers/<id>`) are the share form
  // and still arrive from old links. Hard loads before the service worker is
  // installed get this server redirect; installed clients get the same
  // redirect from the SW (offline too). Crawlers follow it and read the
  // per-item social metadata the shell serves for `?session=` / `?speaker=`.
  // The `[^.]+` guard leaves the static files under /schedule/ (logos, gems)
  // alone; ids never contain dots.
  ...(!isStaticExport && {
    async redirects() {
      return [
        {
          source: "/schedule/:id([^.]+)",
          destination: "/schedule?session=:id",
          permanent: false,
        },
        {
          source: "/speakers/:id([^.]+)",
          destination: "/speakers?speaker=:id",
          permanent: false,
        },
      ];
    },
  }),
  ...(isStaticExport && { output: "export" }),
  // Static export: only .native-app.tsx (single catch-all router for Capacitor)
  // Web build: normal .tsx files with full Next.js routing
  pageExtensions: isStaticExport
    ? ["native-app.tsx", "native-app.ts"]
    : ["tsx", "ts", "jsx", "js"],
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

// Skip Serwist wrapper entirely for static export
export default isStaticExport ? nextConfig : withSerwist(nextConfig);
