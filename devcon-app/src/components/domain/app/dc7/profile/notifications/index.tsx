import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from 'lib/components/button'
import { Separator } from 'lib/components/ui/separator'
import { motion } from 'framer-motion'
import BellIcon from 'assets/icons/bell-simple.svg'
import { pwaUtilities } from '../../../pwa-prompt/pwa-utilities'
import { Toaster } from 'lib/components/ui/toaster'
import { useToast } from 'lib/hooks/use-toast'
import OnboardingNotifications from 'assets/images/dc-7/onboarding-notifications.png'
import cn from 'classnames'
import { APP_CONFIG } from 'utils/config'

export const NotificationCard = (props: any) => {
  const { notification, seen } = props
  const [isNew, _] = useState(!seen)

  const getTimeAgo = (sendAt: string) => {
    const now = new Date()
    const sentDate = new Date(sendAt)
    const diffInSeconds = Math.floor((sentDate.getTime() - now.getTime()) / 1000)

    if (diffInSeconds > 0) {
      if (diffInSeconds < 60) return `Sending in ${diffInSeconds} seconds (ADMINS CAN SEE FUTURE NOTIFICATIONS)`
      if (diffInSeconds < 3600)
        return `Sending in ${Math.floor(diffInSeconds / 60)} minutes (ADMINS CAN SEE FUTURE NOTIFICATIONS)`
      if (diffInSeconds < 86400)
        return `Sending in ${Math.floor(diffInSeconds / 3600)} hours (ADMINS CAN SEE FUTURE NOTIFICATIONS)`
      if (diffInSeconds < 2592000)
        return `Sending in ${Math.floor(diffInSeconds / 86400)} days (ADMINS CAN SEE FUTURE NOTIFICATIONS)`
      return `Sending in ${Math.floor(diffInSeconds / 2592000)} months (ADMINS CAN SEE FUTURE NOTIFICATIONS)`
    }

    const pastDiffInSeconds = Math.abs(diffInSeconds)
    if (pastDiffInSeconds < 60) return `${pastDiffInSeconds} seconds ago`
    if (pastDiffInSeconds < 3600) return `${Math.floor(pastDiffInSeconds / 60)}m ago`
    if (pastDiffInSeconds < 86400) return `${Math.floor(pastDiffInSeconds / 3600)}h ago`
    if (pastDiffInSeconds < 2592000) return `${Math.floor(pastDiffInSeconds / 86400)}d ago`
    if (pastDiffInSeconds < 31536000) return `${Math.floor(pastDiffInSeconds / 2592000)} months ago`

    return `${Math.floor(pastDiffInSeconds / 31536000)} years ago`
  }

  return (
    <div className="flex justify-between gap-0 border border-solid border-gray-200 rounded-lg p-2 w-full bg-white mb-2 relative">
      <div className="flex flex-col gap-2">
        <p className="text-sm semi-bold pr-10">{notification.title}</p>
        <p className="text-sm text-[#717784]">{notification.message}</p>
      </div>
      <div className="flex flex-col gap-1 shrink-0 items-end absolute right-2 top-2">
        <p className="text-xs text-[#7D52F4] shrink-0 font-semibold">{getTimeAgo(notification.sendAt)}</p>
        {isNew && <div className="text-[#7D52F4] h-[12px] flex items-center justify-center text-lg">●</div>}
      </div>
    </div>
  )
}

export const NotificationsList = (props: any) => {
  const [notifications, setNotifications] = React.useState<any>([])

  useEffect(() => {
    const fetchNotifications = async () => {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/notifications`, {
        credentials: 'include',
      })

      const { data } = await response.json()
      setNotifications(data)
    }

    fetchNotifications()
  }, [])

  return (
    <div className="flex flex-col gap-4 mb-6">
      <p className="font-xl semi-bold">Notifications</p>
      {notifications &&
        notifications.length > 0 &&
        notifications.map((notification: any) => (
          <NotificationCard key={notification.id} notification={notification} />
        ))}
    </div>
  )
}

// This is the "push notifications"
export const Notifications = (props: any) => {
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = React.useState(false)
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
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
      toast({
        title: result.message,
        variant: 'default',
        duration: 3000,
      })
      setPushNotificationsEnabled(!pushNotificationsEnabled)
    } else {
      toast({
        title: result.message,
        variant: 'destructive',
        duration: 3000,
      })
    }
    setIsLoading(false)
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.div
        className={cn(
          'flex items-center justify-center p-4 mb-6 lg:mb-12 rounded-full bg-[#EFEBFF] h-[48px] w-[48px] lg:h-[64px] lg:w-[64px]',
          {
            '!mb-4': props.standalone,
            hidden: props.standalone,
          }
        )}
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
            className={cn('plain mt-2 lg:mt-8 w-full', {
              '!mt-2': props.standalone,
              '!w-auto': props.standalone,
            })}
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
            className={cn('plain mt-2 lg:mt-8 w-full', {
              '!mt-2': props.standalone,
              '!w-auto': props.standalone,
            })}
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
