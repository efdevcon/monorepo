import React from 'react'
import css from './menu.module.scss'
import Link from '../link/Link'
import TwitterIcon from 'assets/icons/twitter.svg'
import DiscordIcon from 'assets/icons/discord.svg'
import TelegramIcon from 'assets/icons/telegram.svg'
import GithubIcon from 'assets/icons/github.svg'
import ChevronDown from 'assets/icons/chevron-down.svg'
import HamburgerIcon from 'assets/icons/menu.svg'
import IconCross from 'assets/icons/cross.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'
import ArrowUpIcon from 'assets/icons/arrow-up.svg'
import ArrowDropdown from 'assets/icons/arrow-dropdown.svg'
import DevconnectLogoText from 'assets/images/istanbul-logo-text.svg'
// @ts-ignore
import AnchorLink from 'react-anchor-link-smooth-scroll'
import { createPortal } from 'react-dom'
import { Footer } from 'pages/index'
import { useRouter } from 'next/router'
import FarcasterIcon from 'assets/icons/farcaster.svg'

const MultiLink = (props: any) => {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={css['multi-link']} onClick={() => setOpen(!open)}>
      {props.children}

      <div className={css['hover-to-open']}>
        <ArrowDropdown />
      </div>

      <div className={css['click-to-open']}>{open ? <ChevronUp /> : <ChevronDown />}</div>

      <div className={`${css['dropdown']} ${open && css['open']}`}>
        <div className={`${css['dropdown-content']} fade-in-up fast`}>
          {props.to.map((menuItem: any) => {
            if (menuItem.external) {
              return (
                <Link
                  className={menuItem.customClass}
                  key={menuItem.text}
                  href={menuItem.url}
                  target="_blank"
                  rel="noreferrer"
                  indicateExternal
                >
                  {menuItem.text}
                </Link>
              )
            }

            return (
              <Link
                className={menuItem.customClass}
                key={menuItem.text}
                href={menuItem.url}
                onClick={props.onClickMenuItem}
              >
                {menuItem.text}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const menuItems = (pathname: string) => [
  {
    text: 'About',
    url: pathname === '/' ? '#about' : '/', // Smoothscrolling if already on the page, otherwise hard link
  },
  // {
  //   text: 'Cowork',
  //   url: '/cowork',
  // },
  // {
  //   text: 'City Guide',
  //   url: '/city-guide',
  // },
  // {
  //   text: 'Schedule',
  //   url: '/schedule',
  // },
  // {
  //   text: 'Get Involved',
  //   children: [
  //     {
  //       text: 'Host an event',
  //       external: true,
  //       url: 'https://ef-events.notion.site/How-to-organize-an-event-during-Devconnect-4175048066254f48ae85679a35c94022',
  //     },
  //     {
  //       text: 'Volunteer',
  //       // external: true,
  //       url: '/cowork#volunteer', // cowork#volunteer'https://forms.gle/tEf9UAcn7sHbkQau5',
  //     },
  //     // {
  //     //   text: 'Press Inquiry',
  //     //   external: true,
  //     //   url: 'https://forms.gle/se7hd5Sz5x8Lkoj87',
  //     // },
  //   ],
  // },
  {
    text: 'Past Events',
    children: [
      {
        text: 'Istanbul 2023',
        url: '/istanbul',
      },
      {
        text: 'Amsterdam 2022',
        url: '/amsterdam',
      },
    ],
  },
  {
    text: 'Devcon',
    // onlyFooter: true,
    url: 'https://devcon.org',
  },
  // {
  //   text: 'DCxPrague',
  //   url: 'https://dcxprague.org/',
  //   customClass: css['dcxprague-highlight'],
  // },
  // {
  //   text: 'StreamETH',
  //   customClass: pathname === '/' ? css['streameth-highlight'] : undefined,
  //   url: 'https://streameth.tv',
  // },
]

const Mobile = () => {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) return

    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open, mounted])

  if (!mounted) return null

  return (
    <div className={css['mobile-menu']}>
      <div className={css['foldout-toggle']}>
        <div className={css['icon']} onClick={() => setOpen(true)}>
          <HamburgerIcon className="large-text-em" />
        </div>
      </div>

      {createPortal(
        <div className={`${open ? css['open'] : ''} ${css['foldout']}`}>
          <div className="section">
            <div className={`${css['foldout-toggle']}`}>
              <DevconnectLogoText width="100px" height="50px" />
              <div className={css['icon']} onClick={() => setOpen(false)}>
                <IconCross />
              </div>
            </div>
          </div>

          <Footer inFoldoutMenu onClickMenuItem={() => setOpen(false)} />
        </div>,
        document.body
      )}
    </div>
  )
}

export const FooterMenu = (props: any) => {
  const router = useRouter()

  return (
    <div className={css['footer-menu']} id="footer-menu">
      <AnchorLink href="#__next" id="back-to-top" className={`${css['back-to-top']}`}>
        Back to top <ArrowUpIcon />
      </AnchorLink>

      {menuItems(router.pathname).map((menuItem: any) => {
        const isMultiLink = !!menuItem.children

        if (isMultiLink) {
          return (
            <MultiLink
              className={menuItem.customClass}
              key={menuItem.text}
              to={menuItem.children}
              onClickMenuItem={props.onClickMenuItem}
            >
              {menuItem.text}
            </MultiLink>
          )
        }

        return (
          <Link
            className={menuItem.customClass}
            key={menuItem.text}
            href={menuItem.url}
            onClick={props.onClickMenuItem}
            indicateExternal
          >
            {menuItem.text}
          </Link>
        )
      })}

      <div className={css['social-media']}>
        <a target="_blank" rel="noreferrer" href="https://twitter.com/efdevconnect">
          <TwitterIcon style={{ fill: 'white' }} />
        </a>
        <a target="_blank" rel="noreferrer" href="https://t.me/efdevconnect">
          <TelegramIcon style={{ fill: 'white' }} />
        </a>
        <a target="_blank" rel="noreferrer" href="https://warpcast.com/efdevconnect">
          <FarcasterIcon style={{ fill: 'white' }} />
        </a>
        <a target="_blank" rel="noreferrer" href="https://github.com/efdevconnect/">
          <GithubIcon style={{ fill: 'white' }} />
        </a>
      </div>
    </div>
  )
}

export const Menu = (props: any) => {
  const router = useRouter()

  return (
    <div className={css['menu']}>
      <Mobile />

      {menuItems(router.pathname).map((menuItem: any) => {
        const isMultiLink = !!menuItem.children

        if (menuItem.onlyFooter) return null

        if (isMultiLink) {
          return (
            <MultiLink className={menuItem.customClass} key={menuItem.text} to={menuItem.children}>
              {menuItem.text}
            </MultiLink>
          )
        }

        return (
          <Link className={menuItem.customClass} key={menuItem.text} href={menuItem.url} indicateExternal>
            {menuItem.text}
          </Link>
        )
      })}

      <div className={css['social-media']}>
        <a target="_blank" rel="noreferrer" href="https://twitter.com/efdevconnect">
          <TwitterIcon style={{ fill: 'white' }} />
        </a>
        <a target="_blank" rel="noreferrer" href="https://t.me/efdevconnect">
          <TelegramIcon style={{ fill: 'white' }} />
        </a>

        <a target="_blank" rel="noreferrer" href="https://warpcast.com/efdevconnect">
          <FarcasterIcon style={{ fill: 'white' }} />
        </a>
      </div>
    </div>
  )
}
