import React, { useEffect, useRef } from 'react'
import { Link } from 'src/components/common/link'
import { useIntl } from 'gatsby-plugin-intl'
import { Menu } from './menu'
import { Strip } from './strip'
import { useLocation } from '@reach/router'
import { Search } from './search'
import css from './header.module.scss'
import { useIsScrolled } from 'src/hooks/useIsScrolled'
import HeaderLogo from './HeaderLogo'
import HeaderLogoArchive from './HeaderLogoArchive'
import { useOnOutsideClick } from 'src/hooks/useOnOutsideClick'

type HeaderProps = {
  withStrip?: boolean
  withHero?: boolean
  className?: string
}

export function Header({ withStrip, withHero }: HeaderProps) {
  const ref = useRef(null)
  const intl = useIntl()
  const isScrolled = useIsScrolled()
  const [foldoutOpen, setFoldoutOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const location = useLocation()
  useOnOutsideClick(ref, () => setSearchOpen(false))

  const searchActive = searchOpen && !foldoutOpen

  // Prevent page scroll when menu is open
  useEffect(() => {
    if (foldoutOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [foldoutOpen])

  let headerContainerClass = `${css['header-container']}`
  let headerClass = `${css['header']}`

  if (foldoutOpen) headerClass += ` ${css['foldout-open']}`

  const isArchive = location.pathname.startsWith('/archive')

  const body = (
    <header className={headerContainerClass}>
      {withStrip && <Strip withHero={withHero} />}
      <div id="header" className={headerClass} ref={ref}>
        <div className={css['menu-container']}>
          <Link to={isArchive ? '/archive' : `/${intl.locale}/`}>
            {isArchive ? <HeaderLogoArchive /> : <HeaderLogo />}
          </Link>
          <Menu
            searchOpen={searchOpen}
            setSearchOpen={setSearchOpen}
            foldoutOpen={foldoutOpen}
            setFoldoutOpen={setFoldoutOpen}
          />
        </div>
        <Search open={searchActive} />
      </div>
    </header>
  )

  if (withHero) {
    let headerContainerClass = `${css['header-fixed-container']}`

    if (isScrolled) {
      headerContainerClass += ` ${css['scrolled']}`
    }

    return (
      <div className={headerContainerClass} id="header-strip">
        {body}
      </div>
    )
  }

  return body
}
