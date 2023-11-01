const _self = self as unknown as ServiceWorkerGlobalScope

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

self.addEventListener("fetch", (e: any) => {
  // console.log('[demoPWA - ServiceWorker] Fetch event fired.', e.request.url);
  // const controlledRoutes = ['/schedule', '/speakers', '/rooms'];
  // const requestURL = e.request.url;
  // const controlledRoute = controlledRoutes.find(route => requestURL.includes(route));

  // if (controlledRoute) {
  //   const urlWithNoQuery = requestURL.split('?')[0];

  //   console.log(requestURL, 'request url')
  //   console.log(urlWithNoQuery, 'no query redirect!')

  //   // e.respondWith(fetch(urlWithNoQuery));
  //   e.respondWith(caches.match(urlWithNoQuery).then(response => {
  //       if (response) {
  //           console.log('[demoPWA - ServiceWorker] Retrieving from cache...');
  //           return response;
  //       }
  //       console.log('[demoPWA - ServiceWorker] Retrieving from URL...');
  //       return fetch(e.request);
  //   }))
  //   // );
  // } else {
  //   e.respondWith(fetch(e.request));
  // }

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
});

// _self.addEventListener('push', event => {
//   const data = JSON.parse(event?.data.text() || '{}')
//   event?.waitUntil(
//     _self.registration.showNotification(data.title, {
//       body: data.message,
//       icon: '/icons/android-chrome-192x192.png',
//     })
//   )
// })

// _self.addEventListener('notificationclick', event => {
//   event?.notification.close()
//   event?.waitUntil(
//     _self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
//       if (clientList.length > 0) {
//         let client = clientList[0]
//         for (let i = 0; i < clientList.length; i++) {
//           if (clientList[i].focused) {
//             client = clientList[i]
//           }
//         }
//         return client.focus()
//       }
//       return _self.clients.openWindow('/')
//     })
//   )
// })
