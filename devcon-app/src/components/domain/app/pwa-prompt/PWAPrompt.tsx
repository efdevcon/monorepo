import React, { useEffect } from 'react'
import Image from 'next/image'
import css from './pwa.module.scss'
import IconPlus from 'assets/icons/plus.svg'
import IconAppleShare from 'assets/icons/share-apple.svg'
import imagePWA from 'assets/images/dc-7/pwa-prompt.png'
import { Button } from 'lib/components/button'
import { pwaUtilities } from './pwa-utilities'
import moment from 'moment'
import { AnimatePresence, motion } from 'framer-motion'
import DC7Logo from 'pages/login/dc-7-images/login-logo.png'
import { CircleIcon } from 'lib/components/circle-icon'
import IconClose from 'assets/icons/cross.svg'
import { Separator } from 'lib/components/ui/separator'

const lastSeenKey = 'pwa_prompt_timestamp'
const howOftenToPrompt = [7, 'days'] // [30, 'seconds']

export const PWAPrompt = () => {
  const [open, setOpen] = React.useState(false)

  const promptIfNotLocked = React.useMemo(
    () => () => {
      const lastRejectionTimestamp = localStorage.getItem(lastSeenKey)

      if (lastRejectionTimestamp) {
        const lastRejection = moment.utc(lastRejectionTimestamp)
        const nowWithThreshold = moment.utc().subtract(...howOftenToPrompt)

        // If prompted recently, abort
        if (nowWithThreshold.isBefore(lastRejection)) {
          return
        }
      }

      localStorage.setItem(lastSeenKey, moment.utc().toISOString())

      setTimeout(() => {
        setOpen(true)
      }, 2000)
    },
    []
  )

  const { requiresManualInstall, deferredEvent, setDeferredEvent } = pwaUtilities.useDetectInstallable({
    togglePrompt: promptIfNotLocked,
  })

  useEffect(() => {
    if (requiresManualInstall) {
      promptIfNotLocked()
    }
  }, [requiresManualInstall, promptIfNotLocked])

  // useEffect(() => {
  //   // @ts-ignore
  //   if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox !== undefined) {
  //     navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
  //       // Check if the user is already subscribed
  //       serviceWorkerRegistration.pushManager.getSubscription().then(function (subscription) {
  //         if (subscription) {
  //           console.log('User is already subscribed:', subscription)
  //         } else {
  //           // User is not subscribed, proceed to subscribe
  //           serviceWorkerRegistration.pushManager
  //             .subscribe({
  //               userVisibleOnly: true,
  //               applicationServerKey: process.env.VAPID_PUBLIC,
  //             })
  //             .then(function (subscription) {
  //               console.log('User is subscribed:', subscription)

  //               // Send subscription to your server
  //               return fetch('api/notifications', { method: 'POST', body: JSON.stringify(subscription) })
  //             })
  //             .catch(function (err) {
  //               console.log('Failed to subscribe the user: ', err)
  //             })
  //         }
  //       })
  //     })
  //   }
  // }, [])

  return (
    <div
      className={`fixed top-0 left-0 w-full bottom-0 h-full flex justify-center items-end z-[40] ${
        !open ? 'pointer-events-none' : ''
      }`}
      onClick={() => setOpen(false)}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 left-0 w-full h-full backdrop-blur-xl pointer-events-none"
          ></motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-login"
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%', transition: { type: 'spring', duration: 1, bounce: 0 } }}
            transition={{ duration: 1, type: 'spring', bounce: 0.2 }}
            className="flex justify-center items-end max-w-[500px] lg:h-full rounder-2xl lg:items-center relative pointer-events-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white text-black m-8 relative rounded-2xl shadow border-solid border-black border overflow-hidden lg:mb-0 pointer-events-auto">
              <Image
                alt="Devcon Scientist"
                className={`${css['background']} object-contain object-center h-full w-full rounded-2xl`}
                src={imagePWA}
              />
              <div className="relative">
                <div className="flex items-start justify-between mb-[35vh] p-6 pt">
                  <Image src={DC7Logo} alt="DC7 Logo" className="w-[170px] max-w-[100%] " />

                  <CircleIcon
                    onClick={() => setOpen(false)}
                    // popoverContent={<div>I don&apos;t want to install this app.</div>}
                  >
                    <IconClose />
                  </CircleIcon>
                </div>

                <div className={`p-6 pt-20 text-white relative`}>
                  <div className={`${css['gradient-radial']} absolute inset-0 z-0`}></div>

                  <div className="font-secondary text-3xl lg:text-2xl relative z-10">
                    <b>Devcon Passport</b> is a Progressive Web App! Install on your device.
                  </div>

                  <Separator className="bg-white my-4 relative z-10" />

                  <div className="flex justify-between items-center relative z-10">
                    {requiresManualInstall ? (
                      (() => {
                        if (requiresManualInstall === 'ios') {
                          return (
                            <p className="font-xs bold text-uppercase">
                              IOS Instructions: Open this website in Safari, press{' '}
                              <IconAppleShare
                                className="relative inline-block transform -translate-y-[2px]"
                                style={{ fontSize: '1.2em', fill: 'white' }}
                              />
                              , then &quot;Add to home screen&quot;
                            </p>
                          )
                        } else if (requiresManualInstall === 'samsung') {
                          return (
                            <p className="font-xs bold text-uppercase">
                              Instructions: An &quot;Install&quot; icon will be shown on the top bar OR press
                              &quot;Menu&quot; on the bottom bar then &quot;Add/install to home&quot;
                            </p>
                          )
                        }

                        return (
                          <p className="font-xs bold text-uppercase">
                            Instructions: Press menu on the bottom/top bar then &quot;Add/install to home&quot;
                          </p>
                        )
                      })()
                    ) : (
                      <>
                        <div
                          className="flex items-center font-secondary justify-center shrink-0 bg-white p-3 mr-4 rounded-full hover:scale-110 transition-all duration-500 cursor-pointer"
                          onClick={() =>
                            pwaUtilities.installPwa({
                              togglePrompt: () => setOpen(false),
                              deferredEvent,
                              setDeferredEvent,
                            })
                          }
                        >
                          <CircleIcon className="!bg-[#7D52F4]">
                            <IconPlus style={{ '--color-icon': 'white' }} />
                          </CircleIcon>
                        </div>
                        {/* <Button
                          className="squared light-blue sm"
                          onClick={() =>
                            pwaUtilities.installPwa({
                              togglePrompt: () => setOpen(false),
                              deferredEvent,
                              setDeferredEvent,
                            })
                          }
                        >
                          <IconPlus />
                        </Button> */}

                        <p className="font-xs bold text-uppercase">
                          Install on your device by clicking the button and accepting the prompt!
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className={css['info']}>
                  <div className={css['description']}></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Subscribe/unsubscribe to push notifications manually
export const SubscribePushNotification = () => {
  const [pwaEnabled, setPwaEnabled] = React.useState(false)
  const [dummyValue, setDummyValue] = React.useState('')
  const [pushSubscription, setPushSubscription] = React.useState<any>(null)

  // React.useEffect(() => {
  //   // @ts-ignore
  //   if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox !== undefined) {
  //     setPwaEnabled(true)

  //     navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
  //       // Check if the user is already subscribed
  //       serviceWorkerRegistration.pushManager.getSubscription().then(function (subscription) {
  //         if (subscription) {
  //           setPushSubscription(subscription)

  //           console.log('saving subscription!')
  //         } else {
  //           // User is not subscribed, proceed to subscribe
  //           serviceWorkerRegistration.pushManager
  //             .subscribe({
  //               userVisibleOnly: true,
  //               applicationServerKey: process.env.VAPID_PUBLIC,
  //             })
  //             .then(function (subscription) {
  //               console.log('User is subscribed:', subscription)

  //               // Send subscription to your server
  //               return fetch('api/notifications', { method: 'POST', body: JSON.stringify(subscription) })
  //             })
  //             .catch(function (err) {
  //               console.log('Failed to subscribe the user: ', err)
  //             })
  //         }
  //       })
  //     })
  //   }
  // }, [])

  console.log(pushSubscription, 'push subscription')

  if (!pwaEnabled) return null

  return (
    <div className="flex flex-col gap-4 items-start justify-start">
      {!pushSubscription && (
        <Button
          className="green sm"
          onClick={() => {
            navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
              // Check if the user is already subscribed
              serviceWorkerRegistration.pushManager.getSubscription().then(function (subscription) {
                if (subscription) {
                  setPushSubscription(subscription)
                } else {
                  // User is not subscribed, proceed to subscribe
                  serviceWorkerRegistration.pushManager
                    .subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: process.env.VAPID_PUBLIC,
                    })
                    .then(function (subscription) {
                      setPushSubscription(subscription)
                      console.log('User is subscribed:', subscription)

                      // Send subscription to your server
                      return fetch('api/notifications', { method: 'POST', body: JSON.stringify(subscription) })
                    })
                    .catch(function (err) {
                      console.log('Failed to subscribe the user: ', err)
                    })
                }
              })
            })
          }}
        >
          Subscribe to push notifications
        </Button>
      )}

      {pushSubscription && (
        <Button
          className="red sm"
          onClick={() => {
            pushSubscription
              .unsubscribe()
              .then(() => {
                setPushSubscription(null)
                console.log('UnpushSubscription successful')
              })
              // .then(() => {
              //   removePushSubscriptionFromServer(pushSubscription)
              // })
              .catch((error: Error) => {
                // Unsubscription failed
                console.log('Unsubscription failed:', error)
              })
          }}
        >
          Unsubscribe from push notifications
        </Button>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div className="flex gap-4">
          <input
            type="text"
            className="shadow-xl border border-slate-200 border-solid p-1"
            value={dummyValue}
            onChange={e => setDummyValue(e.target.value)}
          ></input>

          <Button
            className="green sm shadow-xl"
            onClick={() => {
              fetch('/api/notifications/send', { method: 'POST', body: dummyValue })
            }}
          >
            Send notification
          </Button>
        </div>
      )}
    </div>
  )
}
