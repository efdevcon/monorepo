// const _self = self as unknown as ServiceWorkerGlobalScope

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

// _self.addEventListener('push', event => {
//   console.log(event, 'push event')
//   _self.registration.showNotification('Devcon App', {
//     body: event.data.text(),
//     icon: '/icons/android-chrome-192x192.png',
//   })
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
