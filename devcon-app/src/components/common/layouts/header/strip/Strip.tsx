import React, { useEffect } from 'react'
import { usePageContext } from 'context/page-context'
import css from './strip.module.scss'
import { Link } from 'components/common/link'
import { Notification } from 'types/Notification'
import { useTranslations } from 'next-intl'
import IconCross from 'assets/icons/cross.svg'
import { Label } from 'components/common/label'
import hash from 'utils/hash'

type HeaderProps = {
  withHero?: boolean
}

const createNotificationKey = (title: string) => `notification-${hash(title)}`

const getNotification = (notification?: Notification) => {
  if (!notification) return null

  const notificationIsHidden = localStorage.getItem(createNotificationKey(notification.title))

  if (notificationIsHidden) return null

  return notification
}

export const Strip = ({ withHero }: HeaderProps) => {
  const context = usePageContext()
  const [notification, setNotification] = React.useState<Notification | null>(null)
  const intl = useTranslations()

  useEffect(() => {
    setNotification(getNotification(context?.notification))
  }, [context?.notification])

  let className = `section ${css['strip']}`

  if (withHero) className += ` ${css['hero']}`

  return (
    <div className={className} id="strip">
      {notification && (
        <div className={css['body']}>
          <div className={css['notification']}>
            {/* {context?.notification.label && (
              <Label type={context?.notification.labelType || 'notification'}>{context?.notification.label}</Label>
            )} */}

            {notification.url ? (
              <Link to={notification.url} indicateExternal className="hover-underline">
                {notification.title}
              </Link>
            ) : (
              <p>{notification.title}</p>
            )}
          </div>

          <button
            className={`plain ${css['dismiss']}`}
            onClick={() => {
              localStorage.setItem(createNotificationKey(notification.title), 'hidden')

              setNotification(null)
            }}
          >
            <p className="font-xs hover-underline">{intl('dismiss_notification')}</p>
            <IconCross />
          </button>
        </div>
      )}
    </div>
  )
}
