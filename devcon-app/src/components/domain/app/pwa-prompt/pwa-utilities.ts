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
    const [requiresManualInstall, setRequiresManualInstall] = React.useState<false | 'ios' | 'samsung'>(false);

    // When app launches, determine if PWA prompt is possible in browser/OS combination, otherwise trigger the manual prompt with install instructions:
    React.useEffect(() => {
      // Don't prompt if already installed
      if (pwaUtilities.isStandalone()) {
        console.log('standalone preventing prompt')
       
        return; 
      }

      if (pwaUtilities.isIOS()) {
        setRequiresManualInstall('ios');
      } else if (pwaUtilities.isSamsungBrowser()) {
        setRequiresManualInstall('samsung');
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
    console.log('user prompt outcome:',  outcome);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredEvent(null)
  },

  isStandalone: () => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

    if (document.referrer.startsWith("android-app://")) {
      return true; // Trusted web app
    } else if (isStandalone) {
      return true;
    }

    return false;
  },

  isIOS: () => {
    const userAgent = window.navigator.userAgent.toLowerCase();

    return /iphone|ipad|ipod/.test( userAgent );
  },
  isSamsungBrowser: () => {
    return navigator.userAgent.match(
      /SAMSUNG|Samsung|SGH-[I|N|T]|GT-[I|N]|SM-[A|N|P|T|Z]|SHV-E|SCH-[I|J|R|S]|SPH-L/i,
    );
  }
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