import React from 'react'

type DetectInstallableArgs = {
  togglePrompt: () => void
}

type InstallArgs = {
  togglePrompt: () => void
  deferredInstallEvent: Event | null | any
  setDeferredInstallEvent: any
}

export const pwaUtilities = {
  // Detect when browser marks the website as installable and show our custom prompt
  useDetectInstallable: ({ togglePrompt }: DetectInstallableArgs) => {
    const [deferredEvent, setDeferredEvent] = React.useState<Event | null>(null)

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
        window.removeEventListener('beforeinstallprompt', beforeInstallHandler)
        window.removeEventListener('beforeinstallprompt', beforeInstallHandler)
      }
    }, [togglePrompt])

    return [deferredEvent, setDeferredEvent]
  },
  installPwa: async ({ togglePrompt, deferredInstallEvent, setDeferredInstallEvent }: InstallArgs) => {
    if (deferredInstallEvent === null) return

    // Hide the app provided install promotion
    togglePrompt()
    // Show the install prompt
    deferredInstallEvent.prompt()
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredInstallEvent.userChoice
    // Optionally, send analytics event with outcome of user choice
    console.log(`User response to the install prompt: ${outcome}`)
    // We've used the prompt, and can't use it again, throw it away
    setDeferredInstallEvent(null)
  },

  isStandalone: () => {
    // ...
  },
}
