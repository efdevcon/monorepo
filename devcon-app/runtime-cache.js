'use strict'

// This is a decent set of default caching strategies
// Workbox RuntimeCaching config: https://developers.google.com/web/tools/workbox/reference-docs/latest/module-workbox-build#.RuntimeCachingEntry
const defaultRules = [
  {
    urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-webfonts',
      expiration: {
        maxEntries: 4,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
      },
    },
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'google-fonts-stylesheets',
      expiration: {
        maxEntries: 4,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      },
    },
  },
  {
    urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-font-assets',
      expiration: {
        maxEntries: 4,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      },
    },
  },
  {
    urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-image-assets',
      expiration: {
        maxEntries: 64,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
    },
  },
  {
    urlPattern: /\/_next\/image\?url=.+$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'next-image',
      expiration: {
        maxEntries: 64,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
    },
  },
  {
    urlPattern: /\.(?:mp3|wav|ogg)$/i,
    handler: 'CacheFirst',
    options: {
      rangeRequests: true,
      cacheName: 'static-audio-assets',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
    },
  },
  {
    urlPattern: /\.(?:mp4)$/i,
    handler: 'CacheFirst',
    options: {
      rangeRequests: true,
      cacheName: 'static-video-assets',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
    },
  },
  {
    urlPattern: /\.(?:js)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-js-assets',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
    },
  },
  {
    urlPattern: /\.(?:css|less)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-style-assets',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
    },
  },
  {
    urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'next-data',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
    },
  },
  {
    urlPattern: /\.(?:json|xml|csv)$/i,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'static-data-assets',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
    },
  },
  {
    urlPattern: ({ url }) => {
      const isSameOrigin = self.origin === url.origin
      if (!isSameOrigin) return false
      const pathname = url.pathname
      // Exclude /api/auth/callback/* to fix OAuth workflow in Safari without impact other environment
      // Above route is default for next-auth, you may need to change it if your OAuth workflow has a different callback route
      // Issue: https://github.com/shadowwalker/next-pwa/issues/131#issuecomment-821894809
      if (pathname.startsWith('/api/auth/')) return false
      if (pathname.startsWith('/api/')) return true
      return false
    },
    handler: 'NetworkFirst',
    method: 'GET',
    options: {
      cacheName: 'apis',
      expiration: {
        maxEntries: 16,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
      networkTimeoutSeconds: 10, // fall back to cache if api does not response within 10 seconds
    },
  },
  {
    urlPattern: ({ url }) => {
      const isSameOrigin = self.origin === url.origin
      if (!isSameOrigin) return false
      const pathname = url.pathname
      if (pathname.startsWith('/api/')) return false
      return true
    },
    handler: 'NetworkFirst',
    options: {
      cacheName: 'others',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
      networkTimeoutSeconds: 10,
    },
  },
  {
    urlPattern: ({ url }) => {
      const isSameOrigin = self.origin === url.origin
      return !isSameOrigin
    },
    handler: 'NetworkFirst',
    options: {
      cacheName: 'cross-origin',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 60 * 60, // 1 hour
      },
      networkTimeoutSeconds: 10,
    },
  },
]

const customRules = [
  {
    urlPattern: ({ url }) => {
      const { origin, pathname } = url;

      const isApi = origin.includes('localhost:4000') || origin.includes('api.devcon.org');

      if (isApi && pathname.includes('/version')) {
        return true;
      }

      return false;
    },
    handler: 'NetworkFirst', // Network first for version name always; this is what we use to detect if we have to perform requests to speakers/sessions (which are massive datasets with aggressive client side caches)
    options: {
      expiration: {
        maxEntries: 1,
      },
      cacheName: 'devcon-api-version',
      networkTimeoutSeconds: 3,
    },
  },
  // Always use cache for large data sets like speakers and sessions - the cache will be broken by appending a new version to the url on the client side
  {
    urlPattern: ({ url }) => {
      const { origin, pathname } = url;

      const isApi = origin.includes('localhost:4000') || origin.includes('api.devcon.org');

      if (isApi && pathname.includes('/sessions')) {
        return true;
      }

      return false;
    },
    handler: 'CacheFirst',
    options: {
      cacheName: 'devcon-api-sessions',
      expiration: {
        // This will clean up the old cache when a new request is cached - important because this data set is so large
        maxEntries: 1,
      },
      plugins: [
        {
          // This is a bit of an edge case where the client cache mismatches because a new version has been detected but the new data fetch fails - we want it to still return the old data in this case
          // e.g.: https://api.devcon.org/sessions?version=1 is cached, request to https://api.devcon.org/sessions?version=2 fails -
          // handlerDidError makes sure it returns the "version 1" cache anyway, which is not the default behaviour (it matches on the slug by default, which differs here)
          handlerDidError: async ({ event, request, state }) => {
            console.log('Edge case met on sessions fetch: pulling whatever is in cache.');
            // Open the specific cache
            const cache = await caches.open('devcon-api-sessions');
            // Attempt to find any response in this cache
            const keys = await cache.keys();
            let response = null;
            for (const key of keys) {
              response = await cache.match(key);
              if (response) break;
            }
            return response || Response.error(); // Return the found cached response or an error
          },
        },
      ],
    },
  },
  // Always use cache for large data sets like speakers and sessions - the cache will be broken by appending a new version to the url on the client side
  {
    urlPattern: ({ url }) => {
      const { origin, pathname } = url;

      const isApi = origin.includes('localhost:4000') || origin.includes('api.devcon.org');

      if (isApi && pathname.includes('/speakers')) {
        return true;
      }

      return false;
    },
    handler: 'CacheFirst',
    options: {
      cacheName: 'devcon-api-speakers',
      expiration: {
        // This will clean up the old cache when a new request is cached - important because this data set is so large
        maxEntries: 1,
      },
      plugins: [
        {
          // This is a bit of an edge case where the client cache mismatches because a new version has been detected but the new data fetch fails - we want it to still return the old data in this case
          // e.g.: https://api.devcon.org/speakers?version=1 is cached, request to https://api.devcon.org/speakers?version=2 fails -
          // handlerDidError makes sure it returns the "version 1" cache anyway, which is not the default behaviour (it matches on the slug by default, which differs here)
          handlerDidError: async ({ event, request, state }) => {
            console.log('Edge case met on speakers fetch: pulling whatever is in cache.');
            // Open the specific cache
            const cache = await caches.open('devcon-api-speakers');
            // Attempt to find any response in this cache
            const keys = await cache.keys();
            let response = null;
            for (const key of keys) {
              response = await cache.match(key);
              if (response) break;
            }
            return response || Response.error(); // Return the found cached response or an error
          },
        },
      ],
    },
  },
  // // Use stale while revalidate for the rest, decent fallback
  // {
  //   urlPattern: ({ url }) => {
  //     const { origin, pathname } = url

  //     if (['/speakers', '/sessions', '/version'].every(match => pathname.includes(match))) {
  //       return false
  //     }

  //     const isApi = origin.includes('localhost:4000') || origin.includes('api.devcon.org')

  //     if (isApi) return true

  //     return false
  //   },
  //   handler: 'StaleWhileRevalidate',
  //   options: {
  //     cacheName: 'devcon-api',
  //   },
  // },
]

module.exports = [...customRules, ...defaultRules]
