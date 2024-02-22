import React, { useEffect } from 'react'
import Image from 'next/image'
import css from './pwa.module.scss'
import { Modal } from 'components/common/modal'
import IconPlus from 'assets/icons/plus.svg'
import IconAppleShare from 'assets/icons/share-apple.svg'
import imagePWA from 'assets/images/pwa_prompt.png'
import { Button } from 'components/common/button'
import { pwaUtilities } from './pwa-utilities'
import moment from 'moment'

const lastSeenKey = 'pwa_prompt_timestamp'
const howOftenToPrompt = [8, 'hours'] // [30, 'seconds']

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
      setOpen(true)
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

  useEffect(() => {
    // @ts-ignore
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox !== undefined) {
      navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
        // Check if the user is already subscribed
        serviceWorkerRegistration.pushManager.getSubscription().then(function (subscription) {
          if (subscription) {
            console.log('User is already subscribed:', subscription)
          } else {
            // User is not subscribed, proceed to subscribe
            serviceWorkerRegistration.pushManager
              .subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.VAPID_PUBLIC,
              })
              .then(function (subscription) {
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
    }
  }, [])

  return (
    <Modal open={open} close={() => setOpen(!open)} className={`no-scrollbar ${css['modal']}`}>
      <Image alt="Devcon wizard" className={`${css['background']} object-cover h-full w-full`} src={imagePWA} />
      <div className={css['content']}>
        <div className={css['tag']}>
          <p className="font-xs bold">DEVCON PASSPORT APP</p>
        </div>

        <div className={css['info']}>
          <p className={`${css['cta']} font-xl`}>
            This website can be used as an <span className="bold">App!</span> Install by following the instructions
            below.
          </p>

          <div className={css['description']}>
            {requiresManualInstall ? (
              (() => {
                if (requiresManualInstall === 'ios') {
                  return (
                    <p className="font-xs bold text-uppercase">
                      IOS Instructions: Open this website in Safari, press{' '}
                      <IconAppleShare style={{ fontSize: '2em', transform: 'translateY(3px) ' }} />, then &quot;Add to
                      home screen&quot;
                    </p>
                  )
                } else if (requiresManualInstall === 'samsung') {
                  return (
                    <p className="font-xs bold text-uppercase">
                      Instructions: An &quot;Install&quot; icon will be shown on the top bar OR press &quot;Menu&quot;
                      on the bottom bar then &quot;Add/install to home&quot;
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
                <Button
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
                </Button>

                <p className="font-xs bold text-uppercase">
                  Install on your device by clicking the button and accepting the prompt!
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// Subscribe/unsubscribe to push notifications manually
export const SubscribePushNotification = () => {
  const [pwaEnabled, setPwaEnabled] = React.useState(false)
  const [dummyValue, setDummyValue] = React.useState('')
  const [pushSubscription, setPushSubscription] = React.useState<any>(null)

  React.useEffect(() => {
    // @ts-ignore
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox !== undefined) {
      setPwaEnabled(true)

      navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
        // Check if the user is already subscribed
        serviceWorkerRegistration.pushManager.getSubscription().then(function (subscription) {
          if (subscription) {
            setPushSubscription(subscription)

            console.log('saving subscription!')
          } else {
            // User is not subscribed, proceed to subscribe
            serviceWorkerRegistration.pushManager
              .subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.VAPID_PUBLIC,
              })
              .then(function (subscription) {
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
    }
  }, [])

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
