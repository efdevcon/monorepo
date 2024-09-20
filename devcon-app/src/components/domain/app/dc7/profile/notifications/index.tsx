import React from 'react'
import { PushNotification } from 'types/PushNotification'
import { ThumbnailBlock } from 'components/common/thumbnail-block'
import IconCheck from 'assets/icons/check_circle.svg'
// import css from './notifications.module.scss'
// import { useFilter, Filter } from 'components/common/filter'
import { usePageContext } from 'context/page-context'
// import { Search, Tags, Basic, FilterFoldout } from 'components/common/filter/Filter'
import moment from 'moment'
// import { Button } from 'components/common/button'
import { useAppContext } from 'context/app-context'
import Image from 'next/image'
// import EthBackground from 'assets/images/eth-diamond-rainbow.png'
// import AppLogoColor from 'assets/images/app-logo-color.png'
import AppLogo from 'assets/images/app-logo.svg'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { Link } from 'components/common/link'
import { Button } from 'lib/components/button'
import { Separator } from 'lib/components/ui/separator'
import { SubscribePushNotification } from '../../../pwa-prompt/PWAPrompt'
import App from 'next/app'
import { motion } from 'framer-motion'
import BellIcon from 'assets/icons/bell-simple.svg'
import { pwaUtilities } from '../../../pwa-prompt/pwa-utilities'
import { Toaster } from 'lib/components/ui/toaster'
import { useToast } from 'lib/hooks/use-toast'
import OnboardingNotifications from 'assets/images/dc-7/onboarding-notifications.png'

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

export const NotificationCard = () => {
  return 'hello'
}

// export const NotificationCard = React.forwardRef((props: any, ref: any) => {
//   const { seenNotifications, setSeenNotifications } = useAppContext()
//   const [notificationSeen, setNotificationSeen] = useLocalStorage(
//     `notification-seen-${props.notification.id}`,
//     seenNotifications?.[props.notification.id]
//   )

//   const markAsSeen = () => {
//     setSeenNotifications((seenNotifications: any) => {
//       return {
//         ...seenNotifications,
//         [props.notification.id]: true,
//       }
//     })

//     setNotificationSeen('yes')
//   }

//   React.useImperativeHandle(ref, () => ({
//     notificationSeen,
//     markAsSeen,
//   }))

//   // let className = `!shadow-lg ${css['notification-block']}`

//   // if (!notificationSeen) className += ` ${css['highlight']}`

//   const notification = props.notification
//   const dateAsMoment = moment.utc(notification.date)

//   // return (
//   //   <ThumbnailBlock key={notification.id} className={className}>
//   //     <div className={css['top']}>
//   //       <div className={css['time']}>
//   //         <p>{dateAsMoment.format('MM/DD/YY')}</p>
//   //         <p>{dateAsMoment.format('HH:mm A')}</p>
//   //         {/* TODO: Why the fook doesn't this work? */}
//   //         {/* <p>{dateAsMoment.from(moment.utc())}</p> */}
//   //       </div>

//   //       {notificationSeen ? <IconCheck /> : <div className="label sm error bold">New</div>}
//   //     </div>
//   //     <div className={css['details']}>
//   //       {notification.label === 'Twitter' && (
//   //         <p className={`bold hover-underline ${css['title']}`}>
//   //           <Link to={notification.url}>{notification.title}</Link>
//   //         </p>
//   //       )}
//   //       {notification.label !== 'Twitter' && <p className={`bold ${css['title']}`}>{notification.title}</p>}
//   //       <p>{notification.body}</p>
//   //     </div>
//   //     {notification.label && (
//   //       <div className={css['labels']}>
//   //         <div className={`label sm bold ${notification.labelType}`}>{notification.label}</div>
//   //       </div>
//   //     )}
//   //   </ThumbnailBlock>
//   // )
// })

export const Notifications = (props: any) => {
  const pageContext = usePageContext()
  const notificationRefs = React.useRef<any>({})
  const { seenNotifications, setSeenNotifications } = useAppContext()
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState('')
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)

  const unseenNotifications =
    pageContext &&
    pageContext.appNotifications &&
    Object.values(seenNotifications).length < pageContext.appNotifications?.length

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.25,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  }

  React.useEffect(() => {
    const checkPushNotificationStatus = async () => {
      const isSubscribed = await pwaUtilities.checkPushSubscription()
      setPushNotificationsEnabled(isSubscribed)
    }

    checkPushNotificationStatus()
  }, [])

  const handleTogglePushNotifications = async () => {
    setIsLoading(true)
    const result = await pwaUtilities.togglePushSubscription()
    if (result.success) {
      console.log('toast1')
      toast({
        title: result.message,
        variant: 'default',
        duration: 3000,
        position: 'bottom-center',
      })
      setPushNotificationsEnabled(!pushNotificationsEnabled)
    } else {
      console.log('toast2')
      toast({
        title: result.message,
        variant: 'destructive',
        duration: 3000,
        position: 'bottom-center',
      })
    }
    setIsLoading(false)
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.div
        className="flex items-center justify-center p-4 mb-6 lg:mb-12 rounded-full bg-[#EFEBFF] h-[48px] w-[48px] lg:h-[64px] lg:w-[64px]"
        variants={itemVariants}
      >
        <BellIcon style={{ '--color-icon': '#7D52F4' }} className="text-[20px] lg:text-[24px] icon" />
      </motion.div>
      <motion.div className="flex flex-col gap-2 mb-4" variants={itemVariants}>
        <motion.p className="font-xl semi-bold" variants={itemVariants}>
          {pushNotificationsEnabled ? 'Toggle Push Notifications' : 'Turn on Push Notifications'}
        </motion.p>
        <motion.p className="text-[#939393] text-sm" variants={itemVariants}>
          Keep up with all the updates, sessions, events, and experiences around Devcon SEA.
        </motion.p>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Image
          src={OnboardingNotifications}
          alt="Onboarding Notifications"
          className="w-full object-cover min-h-[200px] max-h-[30vh] rounded-xl lg:hidden my-2"
        />
      </motion.div>
      <motion.div variants={itemVariants}>
        {!pushNotificationsEnabled && (
          <Button
            className="plain mt-2 lg:mt-8 w-full"
            color="purple-2"
            fat
            fill
            onClick={handleTogglePushNotifications}
            disabled={isLoading}
          >
            {isLoading ? 'Turning on...' : 'Turn on Notifications'}
          </Button>
        )}

        {pushNotificationsEnabled && (
          <Button
            className="plain mt-8 w-full"
            color="black-1"
            fat
            fill
            onClick={handleTogglePushNotifications}
            disabled={isLoading}
          >
            {isLoading ? 'Turning off...' : 'Turn off Notifications'}
          </Button>
        )}
      </motion.div>

      {props.onSkip && (
        <>
          <Separator className="my-4" />

          <motion.p
            className="flex items-center justify-center lg:items-start text-sm semi-bold cursor-pointer w-full"
            variants={itemVariants}
            onClick={props.onSkip}
          >
            Not right now
          </motion.p>
        </>
      )}

      <Toaster />
    </motion.div>
  )
}
