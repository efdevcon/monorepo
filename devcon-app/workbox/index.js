// const _self = self as unknown as ServiceWorkerGlobalScope
const _self = self

// To disable all workbox logging during development, you can set self.__WB_DISABLE_DEV_LOGS to true
// https://developers.google.com/web/tools/workbox/guides/configure-workbox#disable_logging
//
// self.__WB_DISABLE_DEV_LOGS = true

_self.addEventListener('push', event => {
  _self.registration.showNotification('Devcon App', {
    body: event.data.text(),
    icon: '/android-chrome-192x192.png',
    data: {
      url: '/venue',
    },
  })
})

_self.addEventListener('notificationclick', function (event) {
  event.notification.close() // Close the notification.

  // Navigate to the URL stored in the notification data.
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let client of windowClients) {
        // Check if there is already an open window.
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus()
        }
      }
      // If no window matches, then open a new one.
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url)
      }
    })
  )
})

// _self.addEventListener('install', event => {
//   // Force this installing service worker to become the active service worker.
//   _self.skipWaiting()
// })

// _self.addEventListener('activate', event => {
//   console.log('huh?')
//   event.waitUntil(
//     _self.clients.claim().then(() => {
//       _self.clients.matchAll({ type: 'window' }).then(clients => {
//         clients.forEach(client => {
//           if ('navigate' in client) {
//             client.navigate(client.url)
//           }
//         })
//       })
//     })
//   )
// })
