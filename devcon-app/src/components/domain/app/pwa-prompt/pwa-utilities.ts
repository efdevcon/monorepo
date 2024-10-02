import { makeConsoleLogger } from '@notionhq/client/build/src/logging'
import React from 'react'

type DetectInstallableArgs = {
  togglePrompt: () => void
}

type InstallArgs = {
  togglePrompt: () => void
  deferredEvent: Event | null | any
  setDeferredEvent: any
}

export const pwaUtilities = {
  // Detect when browser marks the website as installable and show our custom prompt
  useDetectInstallable: ({ togglePrompt }: DetectInstallableArgs) => {
    const [deferredEvent, setDeferredEvent] = React.useState<Event | null>(null)
    const [requiresManualInstall, setRequiresManualInstall] = React.useState<false | 'ios' | 'samsung'>(false)

    // When app launches, determine if PWA prompt is possible in browser/OS combination, otherwise trigger the manual prompt with install instructions:
    React.useEffect(() => {
      // Don't prompt if already installed
      if (pwaUtilities.isStandalone()) {
        console.log('standalone preventing prompt')

        return
      }

      if (pwaUtilities.isIOS()) {
        setRequiresManualInstall('ios')
      } else if (pwaUtilities.isSamsungBrowser()) {
        setRequiresManualInstall('samsung')
      }
    }, [])

    // Detect when browser is ready to install the PWA
    React.useEffect(() => {
      const beforeInstallHandler = (e: Event) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault()
        // Stash the event so it can be triggered later.
        setDeferredEvent(e)
        // Update UI notify the user they can install the PWA
        togglePrompt()
        // Optionally, send analytics event that PWA install promo was shown.
        console.log(`'beforeinstallprompt' event was fired.`)
      }

      // User can install via the browser itself (outside our flow) - just making sure to close down the modal if its open in that case
      const outsideFlowInstallHandler = () => {
        window.addEventListener('appinstalled', () => {
          // Hide the app-provided install promotion
          togglePrompt()
          // Clear the deferredPrompt so it can be garbage collected
          setDeferredEvent(null)
          // Optionally, send analytics event to indicate successful install
          console.log('PWA was installed')
        })
      }

      window.addEventListener('appinstalled', outsideFlowInstallHandler)
      window.addEventListener('beforeinstallprompt', beforeInstallHandler)

      return () => {
        window.removeEventListener('appinstalled', outsideFlowInstallHandler)
        window.removeEventListener('beforeinstallprompt', beforeInstallHandler)
      }
    }, [togglePrompt])

    return { deferredEvent, setDeferredEvent, requiresManualInstall } as any
  },
  installPwa: async ({ togglePrompt, deferredEvent, setDeferredEvent }: InstallArgs) => {
    if (deferredEvent === null) return

    // Hide the app provided install promotion
    togglePrompt()
    // Show the install prompt
    deferredEvent.prompt()
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredEvent.userChoice
    // Optionally, send analytics event with outcome of user choice
    console.log('user prompt outcome:', outcome)
    // We've used the prompt, and can't use it again, throw it away
    setDeferredEvent(null)
  },

  // This is our best shot at detecting if we are in PWA mode - should work for all cases, but hard to know for sure - worth testing.
  isStandalone: () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone === true

    if (document.referrer.startsWith('android-app://')) {
      return true //
    } else if (isStandalone || isIOSStandalone) {
      return true
    }

    return false
  },

  isIOS: () => {
    const userAgent = window.navigator.userAgent.toLowerCase()

    return /iphone|ipad|ipod/.test(userAgent)
  },
  isSamsungBrowser: () => {
    return navigator.userAgent.match(/SAMSUNG|Samsung|SGH-[I|N|T]|GT-[I|N]|SM-[A|N|P|T|Z]|SHV-E|SCH-[I|J|R|S]|SPH-L/i)
  },

  togglePushSubscription: async (): Promise<{ success: boolean; message: string }> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { success: false, message: 'Push notifications are not supported in this browser' }
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const existingSubscription = await registration.pushManager.getSubscription()

      if (existingSubscription) {
        await existingSubscription.unsubscribe()
        // Call backend to remove subscription
        const response = await fetch(
          `${
            process.env.NODE_ENV === 'production' ? 'https://api.devcon.org' : 'http://localhost:4000'
          }/push-subscriptions`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ endpoint: existingSubscription.endpoint }),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          return { success: false, message: data.message }
        }

        return { success: true, message: 'Push notifications unsubscribed successfully' }
      } else {
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.VAPID_PUBLIC,
        })
        console.log('Push notification subscribed:', newSubscription)

        console.log('newSubscription', JSON.stringify(newSubscription))
        // Call backend to save subscription
        const response = await fetch(
          `${
            process.env.NODE_ENV === 'production' ? 'https://api.devcon.org' : 'http://localhost:4000'
          }/push-subscriptions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSubscription),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          return { success: false, message: data.message }
        }

        return { success: true, message: 'Push notifications enabled successfully' }
      }
    } catch (error) {
      console.error('Error toggling push subscription:', error)
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return { success: false, message: 'Please allow notifications in your browser settings.' }
      }
      return { success: false, message: 'An error occurred while managing push notifications' }
    }
  },

  checkPushSubscription: async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications are not supported in this browser')
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      return !!subscription
    } catch (error) {
      console.error('Error checking push subscription:', error)
      return false
    }
  },
}

// Chrome - auto
// Safari - Press "Share" icon then "Add to home"
// Samsung internet - An "Install" icon will be shown on the top bar (I didn't quite understand if the app should be registered in Samsung Store for it to show) OR press "Menu" on the bottom bar then "Add/install to home"
// Other browsers - Press menu on the bottom/top bar then "Add/install to home"

// // helps you detect mobile browsers (to show a relevant message as the process of installing your PWA changes from browser to browser)
// var isMobile = {
//   Android: function () {
//     return navigator.userAgent.match(/Android/i);
//   },
//   BlackBerry: function () {
//     return navigator.userAgent.match(/BlackBerry/i);
//   },
//   iOS: function () {
//     return navigator.userAgent.match(/iPhone|iPad|iPod/i);
//   },
//   Opera: function () {
//     return navigator.userAgent.match(/Opera Mini/i);
//   },
//   Samsung: function () {
//     return navigator.userAgent.match(
//       /SAMSUNG|Samsung|SGH-[I|N|T]|GT-[I|N]|SM-[A|N|P|T|Z]|SHV-E|SCH-[I|J|R|S]|SPH-L/i,
//     );
//   },
//   Windows: function () {
//     return (
//       navigator.userAgent.match(/IEMobile/i) ||
//       navigator.userAgent.match(/WPDesktop/i)
//     );
//   },
//   any: function () {
//     return (
//       isMobile.Android() ||
//       isMobile.BlackBerry() ||
//       isMobile.iOS() ||
//       isMobile.Opera() ||
//       isMobile.Windows()
//     );
//   },
// }
