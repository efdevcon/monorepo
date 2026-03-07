import React, { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { Link } from 'components/common/link'
import { Menu } from './menu'
import css from './header.module.scss'
import { useIsScrolled } from 'hooks/useIsScrolled'
import HeaderLogo from './HeaderLogo'
import cn from 'classnames'
import { Strip } from './Strip'
import useGetElementHeight from 'hooks/useGetElementHeight'

type HeaderProps = {
  isApp?: boolean
  withHero?: boolean
  className?: string
}

export const Header = React.memo(({ withHero, className, isApp }: HeaderProps) => {
  const ref = useRef(null)
  const router = useRouter()
  const stripHeight = useGetElementHeight('strip')
  const isScrolled = useIsScrolled()
  const isScrolledPast200 = useIsScrolled(100)
  const [foldoutOpen, setFoldoutOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)

  // Prevent page scroll when menu is open
  useEffect(() => {
    if (foldoutOpen) {
      if (isApp) window.scrollTo(0, 0)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [foldoutOpen, isApp])

  let headerContainerClass = `${css['header-container']}`
  let headerClass = `${css['header']}`

  if (foldoutOpen) headerContainerClass += ` ${css['foldout-open']}`
  if (className) headerContainerClass += ` ${className}`
  if (isApp) headerContainerClass += ` ${css['app']}`
  if (isScrolledPast200 && !withHero) headerContainerClass += ` ${css['scrolled']}`

  const stripStyle = { '--strip-height': `-${stripHeight}px` } as React.CSSProperties

  const body = (
    <header id="header-container" className={headerContainerClass} style={!withHero ? stripStyle : undefined}>
      <Strip />
      <div id="header" className={headerClass} ref={ref}>
        <div className="section">
          <div className={`${css['menu-container']} ${isApp ? css['no-overflow'] : ''}`}>
            <Link to={`/${router.locale}`} data-type="devcon-header-logo">
              <HeaderLogo />
            </Link>

            <Menu
              isApp={isApp}
              searchOpen={searchOpen}
              setSearchOpen={setSearchOpen}
              foldoutOpen={foldoutOpen}
              setFoldoutOpen={setFoldoutOpen}
            />
          </div>
        </div>
      </div>
    </header>
  )

  if (withHero) {
    let fixedContainerClass = `${css['header-fixed-container']}`

    if (isScrolled) fixedContainerClass += ` ${css['filled']}`
    if (isScrolledPast200) fixedContainerClass += ` ${css['scrolled']}`

    return (
      <div className={cn(fixedContainerClass, '')} id="header-strip" style={stripStyle}>
        {body}
      </div>
    )
  }

  return body
})

Header.displayName = 'Header'
