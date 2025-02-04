const _self = self

// To disable all workbox logging during development, you can set self.__WB_DISABLE_DEV_LOGS to true
// https://developers.google.com/web/tools/workbox/guides/configure-workbox#disable_logging
//
// self.__WB_DISABLE_DEV_LOGS = true

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