import React from 'react'
import { PushNotification } from 'types/PushNotification'
import { ThumbnailBlock } from 'components/common/thumbnail-block'
import IconCheck from 'assets/icons/check_circle.svg'
import css from './notifications.module.scss'
// import { useFilter, Filter } from 'components/common/filter'
import { usePageContext } from 'context/page-context'
// import { Search, Tags, Basic, FilterFoldout } from 'components/common/filter/Filter'
import moment from 'moment'
import { Button } from 'components/common/button'
import { useAppContext } from 'context/app-context'
import Image from "next/legacy/image"
import EthBackground from 'assets/images/eth-diamond-rainbow.png'
// import notifications from 'pages/app/notifications'

// Copied from the web-push documentation
// const urlBase64ToUint8Array = (base64String: string) => {
//   const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
//   const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')

//   const rawData = window.atob(base64)
//   const outputArray = new Uint8Array(rawData.length)

//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i)
//   }
//   return outputArray
// }

// const host = 'http://localhost:9000'

// const saveSubscription = async (subscription: any) => {
//   await fetch(`${host}/api/pwa/push_subscription`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       endpoint: subscription.endpoint,
//       keys: subscription.toJSON().keys,
//     }),
//   })
// }

// const subscribePushService = async () => {
//   try {
//     const reg = await navigator.serviceWorker.getRegistration()

//     if (reg && reg.pushManager) {
//       const subscription = await reg.pushManager.getSubscription()

//       if (!subscription) {
//         const key = await fetch(`${host}/api/pwa/vapid`)
//         const keyData = await key.text()

//         console.log(key, keyData)

//         const newSubscription = await reg.pushManager.subscribe({
//           applicationServerKey: urlBase64ToUint8Array(keyData),
//           userVisibleOnly: true,
//         })

//         await saveSubscription(newSubscription)
//       } else {
//         // Syncing with backend even if subscription already exists (just in case it didn't get persisted when it was created; should keep us edge case free)
//         await saveSubscription(subscription)
//       }
//     }
//   } catch (e) {
//     console.log('Error creating/saving subscription:')
//     console.error(e)

//     alert(
//       'Your browser may have automatically blocked push notifications. Refer to your browser documentation to enable push notifications.'
//     )

//     throw e
//   }
// }

// const unsubscribePushService = async () => {
//   await fetch(`${host}/api/pwa/push_subscription`, {
//     method: 'DELETE',
//     headers: { 'Content-Type': 'application/json' },
//   })
// }

// TODO: Disabled because of build errors. Seemed only used for testing purposes..
// const useNotifications = () => {
//   const [serviceWorkerActive, setServiceWorkerActive] = React.useState<any>(false)
//   const [permissionStatus, setPermissionStatus] = React.useState<any>(null)
//   // There is no way to programatically revoke "requestPermission", so we have to keep track of our own separate "revoked" flag
//   const [permissionRevoked, setPermissionRevoked] = React.useState<any>(false)
//   const notificationsEnabled = permissionStatus === 'granted' && !permissionRevoked

//   const revokePermission = React.useCallback(() => {
//     localStorage.setItem('push_permission_revoked', 'yes')
//     setPermissionRevoked(true)
//     unsubscribePushService()
//   }, [])

//   const requestPermission = React.useCallback(() => {
//     console.log('requesting permission')
//     localStorage.removeItem('push_permission_revoked')
//     setPermissionRevoked(false)

//     Notification.requestPermission().then((status: any) => {
//       console.log('request permission callback') // <--- TO-DO: if you change notification settings to "block" then back to "ask" it never gets here nor does it prompt the user...?
//       setPermissionStatus(status)

//       /*
//         Since this request for permission was triggered by a user action (toggling notifications back on) it would be weird if the status becomes denied;
//         when that's the case, it's probable that the browser itself is blocking push notifications - we warn the user that this may be the case so they can take
//         further action
//       */
//       if (status !== 'granted') {
//         alert(
//           'Your browser may have automatically blocked push notifications. Refer to your browser documentation to enable push notifications.'
//         )
//       }
//     })
//   }, [])

//   // Initial setup (wait for service worker, request notification permission (unless revoked))
//   React.useEffect(() => {
//     const permissionIsRevoked = localStorage.getItem('push_permission_revoked') === 'yes'
//     setPermissionRevoked(permissionIsRevoked)
//     setPermissionStatus(Notification.permission)

//     navigator.serviceWorker.ready.then(() => {
//       setServiceWorkerActive(true)
//     })

//     // If permission is revoked it was either due to an earlier error creating the subscription, the browser blocking subscriptions, or the user disabling it
//     // If any of those are true, we don't want to automatically request permission again - the user would have to manually toggle notifications on after resolving whatever issue is present
//     if (!permissionIsRevoked) {
//       navigator.serviceWorker.ready.then(() => {
//         // If permission is already granted the callback will fire instantly without prompting the user, so we don't have to handle that case
//         Notification.requestPermission().then(status => {
//           setPermissionStatus(status)
//         })
//       })
//     }
//   }, [])

//   // Whenever notificationsEnabled becomes true, subscribe to the push service
//   React.useEffect(() => {
//     if (notificationsEnabled) {
//       const subscribe = () => {
//         subscribePushService().catch(e => {
//           revokePermission()
//         })
//       }

//       if (navigator?.serviceWorker?.controller?.state === 'activated') {
//         subscribe()
//       } else {
//         navigator.serviceWorker.ready.then(subscribe)
//       }
//     }
//   }, [notificationsEnabled, revokePermission])

//   console.log(permissionStatus, 'permission status')

//   return [serviceWorkerActive, notificationsEnabled, requestPermission, revokePermission] as [
//     boolean,
//     boolean,
//     () => void,
//     () => void
//   ]
// }

// const useGetNotifications = () => {
//   const [notifications, setNotifications] = React.useState<Array<PushNotification>>([])

//   const fetchNotifications = React.useCallback(() => {
//     fetch(`${host}/api/pwa/notifications`)
//       .then(res => res.json())
//       .then(setNotifications)
//   }, [])

//   // Dummy stuff
//   const createNotifications = React.useCallback(() => {
//     fetch(`${host}/api/pwa/notification`, { method: 'POST' })
//       .then(res => res.json())
//       .then(setNotifications)
//       .then(fetchNotifications)
//   }, [fetchNotifications])

//   React.useEffect(() => {
//     fetchNotifications()
//   }, [fetchNotifications])

//   return {
//     notifications,
//     createNotifications,
//   }
// }

// export const Notifications_test = () => {
//   const [serviceWorkerActive, notificationsEnabled, requestPermission, revokePermission] = useNotifications()
//   const { notifications, createNotifications } = useGetNotifications()

//   console.log(notifications, 'notifications')

//   // if (!serviceWorkerActive) return null

//   return (
//     <div className={css['container']}>
//       {serviceWorkerActive ? (
//         notificationsEnabled ? (
//           <div style={{ color: 'lightgreen' }} onClick={() => revokePermission()}>
//             Push Notifications are enabled
//           </div>
//         ) : (
//           <div style={{ color: 'red' }} onClick={() => requestPermission()}>
//             Push Notifications are disabled
//           </div>
//         )
//       ) : null}

//       <button className={css['create']} onClick={createNotifications}>
//         Create dummy notifications
//       </button>

//       <div className={css['list']}>
//         {notifications.map(notification => {
//           return (
//             <div key={notification._id} className={css['item']}>
//               <p>
//                 <b>{notification.content.title}</b>
//               </p>
//               {notification.content.message}
//             </div>
//           )
//         })}
//       </div>
//     </div>
//   )
// }

const filters = [
  {
    value: 'inbox',
    text: 'Inbox',
  },
  {
    value: 'health-safety',
    text: 'Health & Safety',
  },
  {
    value: 'all',
    text: 'All',
  },
  {
    value: 'archived',
    text: 'Archived',
  },
]

export const NotificationCard = React.forwardRef((props: any, ref: any) => {
  const { seenNotifications, setSeenNotifications } = useAppContext()
  const seen = seenNotifications?.[props.notification.id]

  const markAsSeen = () => {
    setSeenNotifications((seenNotifications: any) => {
      return {
        ...seenNotifications,
        [props.notification.id]: true,
      }
    })

    window.localStorage.setItem(`notification-seen-${props.notification.id}`, 'yes')
  }

  React.useImperativeHandle(ref, () => ({
    seen,
    markAsSeen,
  }))

  let className = css['notification-block']

  if (!seen) className += ` ${css['highlight']}`

  const notification = props.notification
  const dateAsMoment = moment.utc(notification.date)

  return (
    <ThumbnailBlock key={notification.id} className={className}>
      <div className={css['top']}>
        <div className={css['time']}>
          <p>{dateAsMoment.format('MM/DD/YY')}</p>
          <p>{dateAsMoment.format('HH:mm A')}</p>
          {/* TODO: Why the fook doesn't this work? */}
          {/* <p>{dateAsMoment.from(moment.utc())}</p> */}
        </div>

        {seen ? <IconCheck /> : <div className="label sm error bold">New</div>}
      </div>
      <div className={css['details']}>
        <p className={`bold ${css['title']}`}>{notification.title}</p>
        <p>{notification.body}</p>
      </div>
      {notification.label && (
        <div className={css['labels']}>
          <div className={`label sm bold ${notification.labelType}`}>{notification.label}</div>
        </div>
      )}
    </ThumbnailBlock>
  )
})

export const Notifications = (props: any) => {
  const pageContext = usePageContext()
  const notificationRefs = React.useRef<any>({})
  const { seenNotifications, setSeenNotifications } = useAppContext()
  // const [basicFilter, setBasicFilter] = React.useState('all')

  const unseenNotifications =
    pageContext && Object.values(seenNotifications).length < pageContext.appNotifications?.length

  return (
    <div className={css['container']}>
      <div className={css['header']}>
        <h2 className="font-lg-fixed">Notifications</h2>
        {unseenNotifications && (
          <Button
            className="red sm"
            onClick={() => {
              Object.values(notificationRefs.current).forEach((notification: any) => notification.markAsSeen())
            }}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* <Basic
        className={css['filter']}
        value={basicFilter}
        onChange={setBasicFilter}
        options={[
          {
            text: 'All',
            value: 'all',
          },
          {
            text: 'New',
            value: 'new',
          },
        ]}
      /> */}

      {pageContext?.appNotifications.map(notification => {
        return (
          <NotificationCard
            key={notification.id}
            notification={notification}
            ref={(ref: any) => (notificationRefs.current[notification.id] = ref)}
          />
        )
      })}

      <div className={css['background']}>
        <Image src={EthBackground} layout="fill" objectFit="contain" objectPosition="right" alt="Ether" />
      </div>
    </div>
  )
}
