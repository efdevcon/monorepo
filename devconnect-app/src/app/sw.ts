import { defaultCache } from '@serwist/turbopack/worker';
import { type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist';
import { NetworkFirst } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Change this attribute's name to your `injectionPoint`.
    // `injectionPoint` is an InjectManifest option.
    // See https://serwist.pages.dev/docs/build/configuring
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }

  // Type for service worker clients
  interface Client {
    postMessage(message: any, transfer?: Transferable[]): void;
  }
}

// @ts-ignore
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: [
    // Recommendation 2: Enable precaching for better offline support
    ...(self.__SW_MANIFEST || []),
    { url: '/~offline', revision: '1' },
    { url: '/', revision: '1' },
    { url: '/manifest.json', revision: '1' },
  ],
  precacheOptions: {
    concurrency: 10,
    cleanupOutdatedCaches: true,
  },
  skipWaiting: false,
  disableDevLogs: true,
  clientsClaim: false,
  navigationPreload: true, // Enable for faster page loads after updates
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'pages',
        networkTimeoutSeconds: 10,
        plugins: [
          {
            // Recommendation 3: Network timeout detection
            requestWillFetch: async ({ request }) => {
              // Notify clients about slow network after 3 seconds
              const timeoutId = setTimeout(async () => {
                try {
                  const clients = await self.clients.matchAll({ type: 'window' });
                  clients.forEach((client: Client) => {
                    client.postMessage({
                      type: 'SLOW_NETWORK',
                      message: 'Slow connection detected, loading from cache...'
                    });
                  });
                } catch (err) {
                  console.warn('Failed to notify clients about slow network:', err);
                }
              }, 3000);

              // Store timeout ID to clear it later
              (request as any).__timeoutId = timeoutId;

              return request;
            },
            fetchDidSucceed: async ({ request, response }) => {
              // Clear the slow network timeout on successful fetch
              const timeoutId = (request as any).__timeoutId;
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
              return response;
            },
            handlerDidError: async () => {
              return (await caches.match('/~offline')) || Response.error();
            },
          },
        ],
      }),
    },
    // SWR Compatibility: Exclude API routes from service worker caching
    // Let SWR handle all API caching with its own strategies
    {
      matcher: ({ request }) => request.url.includes('/api/'),
      handler: new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        plugins: [
          {
            // Add Cache-Control headers to prevent conflicts with SWR
            cacheWillUpdate: async ({ response }) => {
              // Only cache successful responses
              if (response && response.status === 200) {
                // Clone response and add short TTL header
                const headers = new Headers(response.headers);
                headers.set('X-SW-Cached', 'true');
                return new Response(response.body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: headers,
                });
              }
              return null; // Don't cache errors
            },
          },
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

// Listen for SKIP_WAITING message from client
self.addEventListener('message', (event: any) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Recommendation 6: Better error handling for service worker
self.addEventListener('error', (event: ErrorEvent) => {
  console.error('Service Worker error:', event.error || event.message);
  // Optionally report to analytics or error tracking service
  // Example: reportError({ type: 'sw_error', error: event.error });
});

self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  console.error('Service Worker unhandled rejection:', event.reason);
  // Optionally report to analytics or error tracking service
  // Example: reportError({ type: 'sw_unhandled_rejection', reason: event.reason });
});

serwist.addEventListeners();
