/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";
import {
  DETAIL_ROUTES,
  IGNORED_URL_PARAMS,
  parseDetailPath,
  stripIgnoredParams,
} from "./routing/viewParams";
import { INSTALL_PARAM, installMarker, parseInstallVersion } from "./data/install/installVersion";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

/**
 * Cache-key normaliser for shell HTML and RSC payloads: the query string never
 * changes a shell (`?dataset=…`, `?mockNow=…`, tracking params on shared
 * links), so a request that differs only in params maps to the one cached
 * shell instead of missing offline and forcing a hard navigation.
 */
const ignoreViewParams = {
  cacheKeyWillBeUsed: async ({ request }: { request: Request }) =>
    stripIgnoredParams(new URL(request.url)).toString(),
};

const documents = new NetworkFirst({
  cacheName: "pages",
  // 3 s, not 5: "/" and /my-devcon are served through this route on every app
  // open (they are not precached, see the install listener below), and on
  // flaky venue wifi a longer wait before the cached copy reads as a hang.
  networkTimeoutSeconds: 3,
  plugins: [
    ignoreViewParams,
    new CacheableResponsePlugin({ statuses: [200] }),
    new ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 30 * 24 * 60 * 60,
    }),
  ],
});

/**
 * Detail pages (`/schedule/<id>`, `/speakers/<id>`) get their own strategy
 * instance, on purpose NOT the one registered for documents below: Serwist
 * attaches the `/offline` fallback plugin to every strategy listed in
 * `runtimeCaching`, which makes a failed `handle()` resolve with the offline
 * page instead of throwing. This instance is only ever called from the detail
 * route's handler, so its failures propagate and the handler can answer with
 * the precached tab shell instead.
 */
const detailDocuments = new NetworkFirst({
  cacheName: "pages-detail",
  networkTimeoutSeconds: 5,
  plugins: [
    ignoreViewParams,
    new CacheableResponsePlugin({ statuses: [200] }),
    new ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 30 * 24 * 60 * 60,
    }),
  ],
});

const serwist: Serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  // Take control of the page as soon as this worker activates, so offline works
  // on first install without needing a reopen. Safe only because skipWaiting is
  // false — updates still wait for the user, so a new worker never claims a page
  // running an older build's assets. Do NOT set both to true.
  clientsClaim: true,
  navigationPreload: false,
  // Precache lookups ignore the query string: `/schedule?dataset=x` is served
  // from the precached `/schedule` shell, online and offline.
  precacheOptions: { ignoreURLParametersMatching: IGNORED_URL_PARAMS },
  runtimeCaching: [
    // Installed-app launches. An app installed with the personalised manifest
    // (iOS) starts at /api/auth/bridge?bridge=<token>, which needs the
    // server. With no network that navigation used to end on the /offline
    // page; instead open the ticket page from the cache (the session from the
    // first launch is already in the app's own storage), and give a slow
    // network 5 s before doing the same. Must precede the document rule.
    {
      matcher: ({ request, url, sameOrigin }) =>
        sameOrigin && request.mode === "navigate" && url.pathname === "/api/auth/bridge",
      handler: async ({ request, url }): Promise<Response> => {
        try {
          const signal =
            typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(5_000) : undefined;
          return await fetch(request, { signal });
        } catch {
          // Keep the install version the start_url carries (installVersion.ts).
          const marker = installMarker(parseInstallVersion(url.searchParams.get(INSTALL_PARAM)));
          return Response.redirect(`${self.location.origin}/my-devcon${marker}`, 302);
        }
      },
    },
    // Detail pages (`/schedule/<id>`, `/speakers/<id>`): network first (the
    // server renders per-item social metadata), and when that fails (offline,
    // captive portal) the precached shell of the list tab. The app hydrates
    // from `location`, so the shell renders the detail for the id in the URL
    // from the local store. Never falls through to the /offline page: a
    // never-visited id must work offline too. Must precede the document rule.
    {
      matcher: ({ request, url, sameOrigin }) =>
        sameOrigin &&
        request.mode === "navigate" &&
        parseDetailPath(url.pathname) !== null,
      handler: async ({ request, event, url }): Promise<Response> => {
        try {
          return await detailDocuments.handle({ request, event });
        } catch {
          const kind = parseDetailPath(url.pathname)!.kind;
          const shell: Response | undefined = await serwist.matchPrecache(
            DETAIL_ROUTES[kind]
          );
          return shell ?? Response.error();
        }
      },
    },
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
        // 2s, not 5: these are the payloads a tab tap waits on. On flaky
        // venue wifi a longer wait reads as the app hanging, and the cached
        // shell is identical anyway (all data is client-side via SWR).
        networkTimeoutSeconds: 2,
        plugins: [
          ignoreViewParams,
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
        networkTimeoutSeconds: 2,
        plugins: [
          ignoreViewParams,
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: ({ request }) => request.destination === "document",
      handler: documents,
    },
    // No rule for `/api/*` on purpose: those requests fall through to the
    // browser untouched. SWR owns API data caching, and routing them through
    // the worker only added a failure mode: Safari cold-starts an idle worker
    // for the first request after a pause, and a worker fetch that dies there
    // reaches the page as "Load failed" (seen right after signing in). The
    // RSC and document rules above exclude `/api/` so nothing else catches
    // them; /api/auth/bridge navigations are the one exception, handled first.
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
      // Match by request destination, not URL extension: speaker avatars,
      // highlight and featured images come from Supabase Storage and often have
      // no file extension (or carry query strings, or go through /_next/image),
      // so an extension-only matcher missed them and they never cached for
      // offline. `destination === "image"` covers every <img> / next/image
      // request regardless of URL shape or origin. The extension test is a
      // fallback for images referenced where the destination isn't reported
      // (e.g. some CSS background-image fetches).
      matcher: ({ request, url }) =>
        request.destination === "image" ||
        /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i.test(url.pathname),
      handler: new CacheFirst({
        // Name is also referenced by src/data/hooks/use-warm-images.ts,
        // which reads this cache to warm only what's missing. Rename both.
        cacheName: "static-images",
        plugins: [
          // REQUIRED for cross-origin images, and the reason they silently
          // never cached before. Serwist only skips its status-200-only filter
          // when some plugin implements `cacheWillUpdate`; ExpirationPlugin
          // doesn't (it hooks cachedResponseWillBeUsed / cacheDidUpdate), so
          // the default applied and every opaque response (status 0) was
          // dropped. A no-cors <img> to another origin is always opaque, so
          // that was every avatar and every highlight image. Allowing status 0
          // keeps them cacheable even when a request isn't made with CORS.
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            // Enough for the full speaker roster (~750 avatars) plus
            // highlights, venue art and local assets. Avatars are small webp
            // thumbnails, so this is tens of MB, not hundreds.
            maxEntries: 1200,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            // Opaque responses are quota-padded well beyond their real size, so
            // a cache full of them can hit the limit unexpectedly. Our images
            // request with CORS (see `crossOrigin` on the <img> tags) to avoid
            // that; this stays as the last resort if some other origin's
            // images ever fill it.
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

/**
 * Warm the runtime page cache with "/" and /my-devcon at install, so both open
 * offline on a phone that never visited them online (the ticket QR at the
 * venue entrance, no signal). They are deliberately NOT precached: precache
 * serves cache-first, and these two pages (the ones carrying the install
 * button and the sign-in) must be server-rendered fresh whenever possible,
 * because the <link rel="manifest"> is personalised from the session cookie
 * (see next.config.ts and PersonalizedManifestLink). The `documents`
 * NetworkFirst route above owns this cache, so online loads refresh the copy
 * and offline loads fall back to it. Best effort: a failure here must not
 * fail the install.
 */
const WARM_PAGES = ["/", "/my-devcon"];
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open("pages");
        await Promise.all(
          WARM_PAGES.map(async (path) => {
            const request = new Request(path, { credentials: "same-origin" });
            const response = await fetch(request);
            if (response.ok) await cache.put(request, response);
          })
        );
      } catch {
        // Offline at install time: the page caches itself on first online visit.
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ---------------------------------------------------------------------------
// Taking over from the old Devcon 7 app. After the domain swap
// (docs/app-domain-migration.md) an installed copy of the old app fetches this
// worker from app.devcon.org as its update. Waiting for its pages to close, as
// every other update does, would leave the old app running for a whole session
// on a host that no longer serves it. Its precache is the tell: next-pwa's
// `workbox-precache-*` (this worker's own is `serwist-precache-*`). When it is
// there, activate at once, reload the old app's pages (they then load this app,
// and LegacyInstallGate decides what an old install sees) and remove that
// precache, so the next update of this worker waits for the user as usual.
// The only skipWaiting in this worker: the pages claimed here run the old app,
// never an older build of this one.
// ---------------------------------------------------------------------------
const OLD_APP_PRECACHE = "workbox-precache";

async function oldAppPrecaches(): Promise<string[]> {
  try {
    return (await caches.keys()).filter((name) => name.startsWith(OLD_APP_PRECACHE));
  } catch {
    return [];
  }
}

// Decided at install: Serwist's own activate step may already have removed
// outdated precaches by the time ours runs.
let takingOverOldApp = false;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      takingOverOldApp = (await oldAppPrecaches()).length > 0;
      if (takingOverOldApp) await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await oldAppPrecaches();
      if (!takingOverOldApp && names.length === 0) return;
      await self.clients.claim();
      await Promise.all(names.map((name) => caches.delete(name)));
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Started here, not awaited: a page's navigation waits for this worker to
      // finish activating, so awaiting it would hold both up until the browser
      // gives up (about a minute).
      for (const client of clients) {
        void client.navigate(client.url).catch(() => {
          // Not ours to navigate: the old app reloads on this message.
          client.postMessage({ type: "SW_UPDATED" });
        });
      }
    })()
  );
});

// ---------------------------------------------------------------------------
// Web push (announcements Phase 2). The server sends Apple's Declarative Web
// Push JSON shape ({ web_push: 8030, notification: { title, body, navigate }})
// — Safari 18.4+ displays it without running this worker; everywhere else the
// classic handler below parses the same payload. All display work is wrapped
// in event.waitUntil so the worker isn't killed mid-notification.
// ---------------------------------------------------------------------------

interface PushPayload {
  notification?: { title?: string; body?: string; navigate?: string };
}

self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = (event.data?.json() as PushPayload) ?? {};
  } catch {
    // Non-JSON payload: show something rather than nothing.
  }
  const n = payload.notification ?? {};
  event.waitUntil(
    self.registration.showNotification(n.title || "Devcon", {
      body: n.body,
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
      data: { url: n.navigate || "/notifications" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // "#from=push" lets the page report the open as an analytics event (read
  // and stripped by MatomoAnalytics; keep in step with PUSH_OPEN_HASH there).
  const url = `${event.notification.data?.url || "/notifications"}#from=push`;
  event.waitUntil(
    (async () => {
      // Reuse an app window when one can be focused and steered; fall back to
      // a new window on ANY failure. Every step here can reject on desktop
      // (focus() is refused for windows in another profile or not
      // user-activatable, navigate() for uncontrolled or cross-origin
      // clients), and an unhandled rejection meant the click did nothing
      // (Chrome on macOS, 2026-09-24).
      let clients: readonly WindowClient[] = [];
      try {
        clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
      } catch {}
      for (const client of clients) {
        try {
          const focused = await client.focus();
          await (focused ?? client).navigate(url);
          return;
        } catch {
          // Try the next window; open a fresh one if none works.
        }
      }
      try {
        await self.clients.openWindow(url);
      } catch {
        // Popup blocked or URL refused: nothing more a worker can do.
      }
    })()
  );
});

interface PushSubscriptionChangeEvent extends ExtendableEvent {
  readonly oldSubscription: PushSubscription | null;
  readonly newSubscription: PushSubscription | null;
}

// The browser rotated the subscription (endpoint/keys changed). Re-subscribe
// with the same VAPID key and tell the server, keyed by the OLD endpoint —
// otherwise this device silently stops receiving pushes forever (a known
// unfixed gap in the Devcon SEA implementation).
self.addEventListener("pushsubscriptionchange", (event) => {
  const e = event as unknown as PushSubscriptionChangeEvent;
  const applicationServerKey =
    e.oldSubscription?.options.applicationServerKey ?? undefined;
  const oldEndpoint = e.oldSubscription?.endpoint;
  if (!oldEndpoint) return;
  e.waitUntil(
    (async () => {
      try {
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        await fetch("/api/push/subscriptions/rotate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldEndpoint, subscription }),
        });
      } catch (err) {
        console.error("[sw] push subscription rotation failed:", err);
      }
    })()
  );
});
