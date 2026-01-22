import {
  Serwist,
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  type RuntimeCaching,
} from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Custom runtime caching - only cache static assets, not data/API
const runtimeCaching: RuntimeCaching[] = [
  // Cache static JS/CSS from Next.js build
  {
    matcher: /\/_next\/static\/.*/i,
    handler: new CacheFirst({
      cacheName: "next-static",
    }),
  },
  // Cache static assets (fonts, etc.) from public folder
  {
    matcher: /\.(?:woff|woff2|eot|ttf|otf)$/i,
    handler: new CacheFirst({
      cacheName: "static-fonts",
    }),
  },
  // Cache images from public folder
  {
    matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
    handler: new CacheFirst({
      cacheName: "static-images",
    }),
  },
  // Network-only for API routes - let SWR handle data caching
  {
    matcher: /\/api\/.*/i,
    handler: new NetworkOnly(),
  },
  // Network-first for HTML pages (app shell)
  {
    matcher: ({ request }) => request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: "pages",
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching,
});

serwist.addEventListeners();
