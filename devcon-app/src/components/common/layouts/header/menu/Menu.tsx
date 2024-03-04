import React from 'react'
import css from './menu.module.scss'
import { Link } from 'components/common/link'
// import { Navigation } from './navigation'
import { usePageContext } from 'context/page-context'
import { Link as LinkType } from 'types/Link'
import { Foldout } from './foldout'
import { useRouter } from 'next/router'
import IconMenu from 'assets/icons/menu.svg'
import AccountIcon from 'assets/icons/account.svg'
import IconCross from 'assets/icons/cross.svg'
import SearchIcon from 'assets/icons/search.svg'
import { Tooltip } from 'components/common/tooltip'
import BackIcon from 'assets/icons/subdirectory-left.svg'
import BellIcon from 'assets/icons/bell-simple.svg'
import { LanguageToggle } from 'components/common/layouts/header/strip/language-toggle'
import { TippyProps } from '@tippyjs/react'
import { Notifications } from 'components/domain/app/notifications'
import { useAppContext } from 'context/app-context'
import { useAccountContext } from 'context/account-context'

type ButtonProps = {
  buttons: {
    key: string
    icon: React.ReactNode
    url?: string
    className?: string
    onClick?: any
    tooltip?: TippyProps
  }[]
}

const Buttons = (props: ButtonProps) => {
  const router = useRouter()

  return (
    <div className={css['buttons']}>
      {props.buttons.map(button => {
        let body

        // if (button.url) {
        //   body = (
        //     <Link key={button.key} to={button.url}>
        //       {button.icon}
        //     </Link>
        //   )
        // } else {
        body = (
          <button
            key={button.key}
            aria-label={button.key}
            className={`plain ${button.className}`}
            onClick={button.url ? () => router.push(button.url as any) : button.onClick}
          >
            {button.icon}
          </button>
        )
        // }

        if (button.tooltip) {
          return (
            <Tooltip key={button.key} {...button.tooltip} touch={false}>
              {/* Need the wrapping div due to Link and Tooltip not interacting well together */}
              {body}
            </Tooltip>
          )
        }

        return body
      })}
    </div>
  )
}

export const Menu = (props: any) => {
  const router = useRouter()
  const context = usePageContext()
  const appContext = useAppContext()
  const accountContext = useAccountContext()

  let buttons: ButtonProps['buttons'] = [
    {
      key: 'account',
      tooltip: {
        content: 'Account',
      },
      icon: <AccountIcon />,
      url: '/login',
    },
    {
      key: 'mobile-menu-toggle',
      icon: props.foldoutOpen ? <IconCross style={{ width: '0.8em' }} /> : <IconMenu />,
      onClick: () => props.setFoldoutOpen(!props.foldoutOpen),
      className: css['mobile-only'],
    },
  ]

  if (props.isApp) {
    const notifications = context?.appNotifications
    const seenNotifications = appContext.seenNotifications

    const countUnreadNotifications = notifications ? notifications.length - Object.values(seenNotifications).length : 0

    buttons = [
      {
        key: 'account',
        tooltip: {
          content: 'Account',
        },
        icon: <AccountIcon />,
        url: accountContext.account ? '/settings' : '/login',
      },
      {
        key: 'notifications',
        tooltip: {
          content: 'Notifications',
        },
        icon: (
          <div className={css['app-notifications']}>
            {props.foldoutOpen ? (
              <IconCross style={{ width: '0.8em' }} />
            ) : (
              <>
                <BellIcon style={props.foldoutOpen ? { opacity: 0.7 } : {}} />
                {countUnreadNotifications > 0 && <div className={css['counter']}>{countUnreadNotifications}</div>}
              </>
            )}
          </div>
        ),
        onClick: () => props.setFoldoutOpen(!props.foldoutOpen),
      },

      // {
      //   key: 'back-button',
      //   tooltip: {
      //     content: 'Leave App',
      //   },
      //   icon: <BackIcon style={{ fontSize: '1.2em', transform: 'translateX(-2px)' }} />,
      //   url: '/',
      // },
    ]
  }

  let className = css['menu']

  if (props.isApp) className += ` ${css['is-app']}`

  return (
    <div className={className}>
      {/* {!props.isApp && (
        <>
          <Left navigationData={context?.navigation} />

          <div className={css['right']}>
            <Navigation navigationData={context?.navigation} />

            <div className={css['language-toggle-container']}>
              <LanguageToggle />
            </div>
          </div>

          <Foldout foldoutOpen={props.foldoutOpen} setFoldoutOpen={props.setFoldoutOpen}>
            <div className={css['foldout-top']}>
              <Left navigationData={context?.navigation} />
              <LanguageToggle />
            </div>
            <Navigation setFoldoutOpen={props.setFoldoutOpen} navigationData={context?.navigation} mobile={true} />
          </Foldout>
        </>
      )} */}

      <Buttons buttons={buttons} />

      {/* <Search open={props.setSearchOpen} /> */}

      {/* Mobile */}
      <Foldout isApp foldoutOpen={props.foldoutOpen} setFoldoutOpen={props.setFoldoutOpen}>
        <Notifications />
      </Foldout>
    </div>
  )
}
