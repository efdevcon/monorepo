import React from 'react'
import css from './menu.module.scss'
import { Link } from 'src/components/common/link'
import { Navigation } from './navigation'
import { usePageContext } from 'src/context/page-context'
import { Link as LinkType } from 'src/types/Link'
import { Foldout } from './foldout'
import IconMenu from 'src/assets/icons/menu.svg'
import IconCross from 'src/assets/icons/cross.svg'
import SearchIcon from 'src/assets/icons/search.svg'
import { LanguageToggle } from 'src/components/common/layouts/header/strip/language-toggle'

type ButtonProps = {
  buttons: {
    key: string
    icon: React.ReactNode
    url?: string
    className?: string
    onClick?: any
  }[]
}

export const Left = (props: any) => {
  return (
    <div className={css['left']}>
      {props.navigationData.top.map((i: LinkType) => {
        return (
          <Link key={`top-${i.url}`} external to={i.url} className={`hover-underline ${css['highlighted-link']}`}>
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
        let className = css['button']

        if (button.url) {
          return (
            <Link key={button.key} to={button.url} className={className}>
              {button.icon}
            </Link>
          )
        }

        return (
          <button key={button.key} aria-label={button.key} className={`${className} plain ${button.className}`} onClick={button.onClick}>
            {button.icon}
          </button>
        )
      })}
    </div>
  )
}

export const Menu = (props: any) => {
  const { navigation, location } = usePageContext()

  let buttons: ButtonProps['buttons'] = [
    // {
    //   key: 'account',
    //   icon: <AccountIcon />,
    //   url: '/app/profile',
    // },
    {
      key: 'mobile-menu-toggle',
      icon: props.foldoutOpen ? <IconCross style={{ width: '0.8em' }} /> : <IconMenu />,
      onClick: () => props.setFoldoutOpen(!props.foldoutOpen),
      className: css['mobile-only'],
    },
  ]

  if (location.pathname.startsWith('/archive')) {
    buttons = [
      {
        key: 'search',
        icon: <SearchIcon style={props.searchOpen ? { opacity: 0.5 } : undefined} />,
        onClick: () => props.setSearchOpen(!props.searchOpen),
      },
      ...buttons,
    ]
  }

  return (
    <div className={css['menu']}>
      <Left navigationData={navigation} />

      <div className={css['right']}>
        <Navigation navigationData={navigation} />
      </div>

      <Buttons buttons={buttons} />

      {/* <Account /> */}
      {/* <Search open={props.setSearchOpen} /> */}
      {/* </Buttons> */}

      {/* Mobile */}
      <Foldout foldoutOpen={props.foldoutOpen} setFoldoutOpen={props.setFoldoutOpen}>
        <div className={css['foldout-top']}>
          <Left navigationData={navigation} />
          <LanguageToggle />
        </div>
        <Navigation setFoldoutOpen={props.setFoldoutOpen} navigationData={navigation} mobile={true} />
      </Foldout>
    </div>
  )
}
