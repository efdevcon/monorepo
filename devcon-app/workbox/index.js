const _self = self

// To disable all workbox logging during development, you can set self.__WB_DISABLE_DEV_LOGS to true
// https://developers.google.com/web/tools/workbox/guides/configure-workbox#disable_logging
//
// self.__WB_DISABLE_DEV_LOGS = true

// Nextjs build id
// const buildId = process.env.CONFIG_BUILD_ID

// listen to message event from window
// _self.addEventListener('message', event => {
//   // HOW TO TEST THIS?
//   // Run this in your browser console:
//   //     window.navigator.serviceWorker.controller.postMessage({command: 'log', message: 'hello world'})
//   // OR use next-pwa injected workbox object
//   //     window.workbox.messageSW({command: 'log', message: 'hello world'})
//   // console.log(event?.data, 'data')
//   // console.log(process.env, 'env')
// })

// _self.addEventListener("fetch", (e: any) => {
//   console.log('FETCH', e.request.url)
//   // const controlledRoutes = ['/schedule', '/speakers', '/rooms'];
//   const requestURL = e.request.url;
//   // const controlledRoute = controlledRoutes.find(route => requestURL.includes(route));

//   if (requestURL.includes('api.devcon.org')) {
//     // const urlWithNoQuery = requestURL.split('?')[0];

//     // e.respondWith(fetch(urlWithNoQuery));
//     e.respondWith(caches.match(e.request).then(response => {
//         if (response) {
//             console.log('[demoPWA - ServiceWorker] Retrieving from cache...');
//             return response;
//         }
//         console.log('[demoPWA - ServiceWorker] Retrieving from URL...');
//         return fetch(e.request);
//     }))
//     // );
//   }

// e.respondWith(
//   caches.match(e.request).then(function(response) {
//       if (response) {
//           console.log('[demoPWA - ServiceWorker] Retrieving from cache...');
//           return response;
//       }
//       console.log('[demoPWA - ServiceWorker] Retrieving from URL...');
//       return fetch(e.request);
//   })
// );
// });

// _self.addEventListener('activate', event => {
//   console.log('activated')
//   if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
//         serviceWorkerRegistration.pushManager.subscribe({
//             userVisibleOnly: true
//         }).then(function(subscription) {
//             console.log('User is subscribed:', subscription);
//             // Send subscription to your server
//         }).catch(function(err) {
//             console.log('Failed to subscribe the user: ', err);
//         });
//     });
//   }
// });

_self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data.json()
  } catch (e) {
    console.error('Error parsing push event data:', e)
  }

  const title = data.title ? data.title : 'Devcon SEA Passport'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-256x256.png',
    // badge: '/icons/badge.png', // Small icon for notification badge
    badge: '/icon-256x256.png', // Small icon for notification badge
    // image: data.image || '/images/notification-image.png', // Large image to display in the notification
    // tag: 'devcon-notification', // Tag to identify the notification - this will cause the notification to replace the previous one with the same tag
    data: { url: data.url || '/' }, // Custom data to associate with the notification
    actions: [
      {
        action: 'open_url',
        title: 'Open Devcon Passport',
        // icon: '/favicon-32x32.png',
      },
    ],
    // requireInteraction: true, // Notification will remain active until the user interacts with it
    // silent: false, // Notification will make a sound
  }

  _self.registration.showNotification(title, options)
})

// Add this new event listener
_self.addEventListener('notificationclick', event => {
  event.notification.close() // Close the notification

  // Handle the click action
  if (event.action === 'open_url') {
    const urlToOpen = event.notification.data.url || '/'
    event.waitUntil(
      _self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        // If a window is already open, focus it
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // If no window is open, open a new one
        if (_self.clients.openWindow) {
          return _self.clients.openWindow(urlToOpen)
        }
      })
    )
  }
})

// TODO: this breaks things
// self.addEventListener('fetch', event => {
//   event.respondWith(
//     caches.match(event.request).then(cachedResponse => {
//       if (cachedResponse) {
//         return cachedResponse
//       }
//       return fetch(event.request).then(response => {
//         // Check if the response is a 404
//         if (response.status === 404) {
//           // Handle 404 response, e.g., return a custom 404 page or ignore caching
//           return caches.match('/404') || Response.error()
//         }
//         // Cache the response if it's not a 404
//         const responseClone = response.clone()
//         caches.open('dynamic-cache').then(cache => {
//           cache.put(event.request, responseClone)
//         })
//         return response
//       })
//     })
//   )
// })
