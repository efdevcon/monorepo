import React from 'react'
import css from './app-nav.module.scss'
import IconBack from 'assets/icons/arrow_left.svg'
import { Link } from 'components/common/link'
import IconSwirl from 'assets/icons/swirl.svg'
import { useRouter } from 'next/router'
import SwipeToScroll from 'components/common/swipe-to-scroll'
// import { useHistory } from '../history-tracker'

export type NavLink = {
  title: string
  to?: string
  onClick?: () => void
  useIsActive?: (pathname: string) => boolean
}

type LinksProps = {
  nested?: boolean
  links: NavLink[]
}

export const isSelected = (link: NavLink, pathname: string) => {
  // if (!link.to) return false

  // Definitely some possible edge cases - may want to think of a more sophisticated way to see if a route is active, but realistically this probably works
  return link.useIsActive ? link.useIsActive(pathname) : link.to ? pathname.includes(link.to) : false
}

export const Links = (props: LinksProps) => {
  const router = useRouter()

  return (
    <div className={`${css['inline-nav']}`}>
      {props.links.map((link: NavLink, index: number) => {
        let className = css['nav-item']

        // If there's only one item, we can assume it's selected
        const selected = (() => {
          if (props.links.length === 1) return true

          return isSelected(link, router.pathname)
        })()

        if (selected) className += ` ${css['selected']}`

        const title = link.title

        const body = link.to ? (
          <Link className={className} onClick={link.onClick} to={link.to} allowDrag key={link.to || index}>
            {title}
          </Link>
        ) : (
          <p className={className} onClick={link.onClick} key={link.to || index}>
            {title}
          </p>
        )

        return body
      })}
    </div>
  )
}

type NavProps = {
  nested?: boolean
  renderRight?: React.FC
  links?: NavLink[]
}

// The root/main navigation:
const defaultLinks = [
  {
    title: 'Home',
    to: '/app',
    useIsActive: pathname => {
      return pathname.endsWith('/app')
    },
  },
  // {
  //   title: 'Dashboard',
  //   to: '/app/dashboard',
  // },
  {
    title: 'Schedule',
    to: '/app/schedule',
  },
  {
    title: 'Speakers',
    to: '/app/speakers',
  },
  {
    title: 'Venue',
    to: '/app/venue',
  },
  {
    title: 'Info',
    to: '/app/info',
  },
  {
    title: 'Side Events',
    to: '/app/side-events',
  },
] as NavLink[]

export const AppNav = React.memo((props: NavProps) => {
  const router = useRouter()
  // const historyDepth = useHistory()
  // const previousRouteWasInApp = previousRoute?.startsWith('/app')

  // const parentRoute = (() => {
  //   if (!props.nested) return

  //   const pathname = router.pathname
  //   const normalizedPathname = pathname[pathname.length - 1] === '/' ? pathname.slice(0, pathname.length - 1) : pathname
  //   const toRemove = normalizedPathname.split('/').pop()
  //   const nextPathname = normalizedPathname.replace(toRemove ?? '', '')

  //   return nextPathname
  // })()

  return (
    <div id="inline-nav" className={`${css['container']} section no-overflow`}>
      <div className={`${props.renderRight ? css['has-right'] : ''} ${css['nav-content']}`}>
        <div className={css['left']}>
          <IconBack
            className={`${css['icon']} icon`}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              router.back()
            }}
          />

          {/* {historyDepth > 0 ? (
            <IconBack
              className={`${css['icon']} icon`}
              onClick={() => {
                router.back()
              }}
            />
          ) : (
            <IconSwirl className={`${css['icon']} icon`} />
          )} */}

          {/* {props.nested ? (
            <Link className={`${css['icon']} icon ${css['nested']}`}>
              <IconBack />
            </Link>
          ) : (
            <IconSwirl className={`${css['icon']} icon`} />
          )} */}
        </div>

        <SwipeToScroll scrollIndicatorDirections={{ right: true, left: true }}>
          <Links links={defaultLinks} {...props} />
        </SwipeToScroll>

        {props.renderRight && (
          <div className={`${css['right']}`}>
            <props.renderRight />
          </div>
        )}
      </div>
    </div>
  )
})

AppNav.displayName = 'AppNav'
