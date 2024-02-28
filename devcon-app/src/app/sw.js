import { defaultCache } from '@serwist/next/browser'
import { installSerwist } from '@serwist/sw'

installSerwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: process.env.NODE_ENV === 'development' ? undefined : defaultCache,
})

self.addEventListener('push', event => {
  self.registration.showNotification('Devcon App', {
    body: event.data.text(),
    icon: '/icons/android-chrome-192x192.png',
  })
})
