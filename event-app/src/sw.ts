/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  // Take control of the page as soon as this worker activates, so offline works
  // on first install without needing a reopen. Safe only because skipWaiting is
  // false — updates still wait for the user, so a new worker never claims a page
  // running an older build's assets. Do NOT set both to true.
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // Next.js App Router fetches RSC payloads (header `RSC: 1`) for client-side
    // navigation and reconciliation. These are NOT `destination: "document"`
    // requests, so without dedicated rules they'd hit the network and fail
    // offline — and Next.js reacts to a failed RSC fetch by forcing a hard
    // navigation, which (with no offline document either) produces an infinite
    // reload loop. Cache them (separate cache from HTML to avoid key collisions
    // on the same URL) so navigations resolve offline. Mirrors @serwist/next's
    // `defaultCache`. Must precede the document rule.
    {
      matcher: ({ request, url, sameOrigin }) =>
        sameOrigin &&
        request.headers.get("RSC") === "1" &&
        request.headers.get("Next-Router-Prefetch") === "1" &&
        !url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "pages-rsc-prefetch",
        networkTimeoutSeconds: 5,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: ({ request, url, sameOrigin }) =>
        sameOrigin && request.headers.get("RSC") === "1" && !url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "pages-rsc",
        networkTimeoutSeconds: 5,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: ({ request }) => request.destination === "document",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 5,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      // SWR handles API data caching — keep SW out of the way
      matcher: /\/api\/.*/i,
      handler: new NetworkOnly(),
    },
    {
      matcher: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      // Next.js hashed chunks — SWR with anti-truncation guard so a single
      // bad fetch can't poison the cache permanently.
      matcher: /\/_next\/static\/.*\.(?:js|css|woff2?|ttf|eot)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "next-static",
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 2000,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
          {
            cacheWillUpdate: async ({ response }) => {
              if (!response || response.status !== 200) return null;
              const len = response.headers.get("content-length");
              if (len !== null && parseInt(len, 10) < 200) return null;
              const clone = response.clone();
              const text = await clone.text();
              if (text.length < 200) return null;
              return response;
            },
          },
        ],
      }),
    },
    {
      // Match by request destination, not URL extension: speaker avatars and
      // other images come from cross-origin CDNs and often have no file
      // extension (or carry query strings, or go through /_next/image), so an
      // extension-only matcher missed them and they never cached for offline.
      // `destination === "image"` covers every <img> / next/image request
      // regardless of URL shape or origin. The extension test is a fallback for
      // images referenced where the destination isn't reported (e.g. some CSS
      // background-image fetches).
      matcher: ({ request, url }) =>
        request.destination === "image" ||
        /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i.test(url.pathname),
      handler: new CacheFirst({
        cacheName: "static-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 400,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            // Cross-origin images are opaque responses, which count heavily
            // toward the storage quota — drop the cache rather than error out
            // if we ever hit the limit.
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    {
      matcher: /\.(?:woff|woff2|eot|ttf|otf)$/i,
      handler: new CacheFirst({
        cacheName: "static-fonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
        ],
      }),
    },
  ],
  // When a document navigation can't be served (offline, on a route that isn't
  // precached and was never cached — e.g. a dynamic detail page opened for the
  // first time offline), fall back to the precached /offline page instead of
  // failing. A failed top-level navigation is what lets the reload loop run
  // forever; guaranteeing the document side always resolves stops it.
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
