import React from 'react'
import css from './menu.module.scss'
import { Link } from 'components/common/link'
import { Navigation } from './navigation'
import { usePageContext } from 'context/page-context'
import { Link as LinkType } from 'types/Link'
import { Foldout } from './foldout'
import IconMenu from 'assets/icons/menu.svg'
import AccountIcon from 'assets/icons/account.svg'
import IconCross from 'assets/icons/cross.svg'
// import SearchIcon from 'assets/icons/search.svg'
import { Tooltip } from 'components/common/tooltip'
// import { LanguageToggle } from 'components/common/layouts/header/strip/language-toggle'
import useNavigationData from '../useNavigationData'
import { TippyProps } from '@tippyjs/react'
// import { Notifications } from 'components/domain/app/notifications'

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

export const Left = (props: any) => {
  const navigationData = useNavigationData()

  return (
    <div className={css['left']}>
      {navigationData.top.map((i: LinkType) => {
        return (
          <Link
            indicateExternal
            key={`top-${i.url}`}
            external
            to={i.url}
            className={`hover-underline ${css['highlighted-link']}`}
          >
            {i.title}
          </Link>
        )
      })}
    </div>
  )
}

const Buttons = (props: ButtonProps) => {
  return (
    <div className={css['buttons']}>
      {props.buttons.map(button => {
        let body

        if (button.url) {
          body = (
            <Link key={button.key} to={button.url}>
              {button.icon}
            </Link>
          )
        } else {
          body = (
            <button
              key={button.key}
              aria-label={button.key}
              className={`plain ${button.className}`}
              onClick={button.onClick}
            >
              {button.icon}
            </button>
          )
        }

        if (button.tooltip) {
          return (
            <Tooltip key={button.key} {...button.tooltip} touch={false}>
              {/* Need the wrapping div due to Link and Tooltip not interacting well together */}
              <div>{body}</div>
            </Tooltip>
          )
        }

        return body
      })}
    </div>
  )
}

export const Menu = (props: any) => {
  const context = usePageContext()

  let buttons: ButtonProps['buttons'] = [
    // {
    //   key: 'account',
    //   tooltip: {
    //     content: 'Account',
    //   },
    //   icon: <AccountIcon />,
    //   url: 'https://app.devcon.org/login',
    // },
    {
      key: 'mobile-menu-toggle',
      icon: props.foldoutOpen ? <IconCross style={{ width: '0.8em' }} /> : <IconMenu />,
      onClick: () => props.setFoldoutOpen(!props.foldoutOpen),
      className: css['mobile-only'],
    },
  ]

  let className = css['menu']

  return (
    <div className={className}>
      {!props.isApp && (
        <>
          <Left navigationData={context?.navigation} />

          <div className={css['right']}>
            <Navigation navigationData={context?.navigation} />

            {/* <div className={css['language-toggle-container']}>
              <LanguageToggle />
            </div> */}
          </div>

          <Foldout foldoutOpen={props.foldoutOpen} setFoldoutOpen={props.setFoldoutOpen}>
            <div className={css['foldout-top']}>
              <Left navigationData={context?.navigation} />
              {/* <LanguageToggle /> */}
            </div>
            <Navigation setFoldoutOpen={props.setFoldoutOpen} navigationData={context?.navigation} mobile={true} />
          </Foldout>
        </>
      )}

      <Buttons buttons={buttons} />
    </div>
  )
}
