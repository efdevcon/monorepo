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
import GlobeIcon from 'assets/icons/world.svg'
import { Popover, PopoverTrigger, PopoverContent } from 'lib/components/ui/popover'
import DevconnectLogoText from 'assets/images/istanbul-logo-text.svg'
// @ts-ignore
import AnchorLink from 'react-anchor-link-smooth-scroll'
import { createPortal } from 'react-dom'
import { Footer } from 'pages/index'
import { useRouter } from 'next/router'
import FarcasterIcon from 'assets/icons/farcaster.svg'
import cn from 'classnames'
import { useScroll } from 'framer-motion'
import { useDevaBotStore } from 'store/devai'

const MultiLink = (props: any) => {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn(css['multi-link'], props.className)} onClick={() => setOpen(!open)}>
      {props.children}

      <div className={css['hover-to-open']}>
        <ArrowDropdown />
      </div>

      <div className={css['click-to-open']}>{open ? <ChevronUp /> : <ChevronDown />}</div>

      <div className={`${css['dropdown']} ${open && css['open']}`}>
        <div className={`${css['dropdown-content']} rounded-lg`}>
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
    text: (globalThis as any).translations.about,
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
    text: (globalThis as any).translations.past_events,
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

const Mobile = (props: any) => {
  // const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) return

    if (props.menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [props.menuOpen, mounted])

  if (!mounted) return null

  console.log(props.menuOpen, 'menuOpen')

  return (
    <div className={css['mobile-menu']}>
      <div className={cn(css['foldout-toggle'], 'hover:scale-[1.1] transition-all duration-300 flex lg:hidden')}>
        <div className={css['icon']} onClick={() => props.setMenuOpen(!props.menuOpen)}>
          <HamburgerIcon className="text-lg " />
        </div>
      </div>

      {createPortal(
        <div className={`${props.menuOpen ? css['open'] : ''} ${css['foldout']}`}>
          <div className="section py-4">
            <div className={`${css['foldout-toggle']} flex justify-between`}>
              {/* <DevconnectLogoText width="100px" height="50px" />
              <div className={css['icon']} onClick={() => props.setMenuOpen(false)}>
                <IconCross />
              </div> */}
            </div>
          </div>

          <Footer inFoldoutMenu onClickMenuItem={() => props.setMenuOpen(false)} />
        </div>,
        document.body
      )}
    </div>
  )
}

export const FooterMenu = (props: any) => {
  const [languageOpen, setLanguageOpen] = React.useState(false)
  const router = useRouter()

  return (
    <div className={cn(css['footer-menu'], 'pt-2.5')}>
      <AnchorLink href="#__next" id="back-to-top" className={`${css['back-to-top']}`}>
        {(globalThis as any).translations.back_to_top} <ArrowUpIcon />
      </AnchorLink>

      {menuItems(router.pathname).map((menuItem: any) => {
        const isMultiLink = !!menuItem.children

        if (isMultiLink) {
          return (
            <MultiLink
              className={cn(menuItem.customClass, 'flex')}
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
            className={cn(menuItem.customClass, 'flex')}
            key={menuItem.text}
            href={menuItem.url}
            onClick={props.onClickMenuItem}
            indicateExternal
          >
            {menuItem.text}
          </Link>
        )
      })}

      <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-2 hover:cursor-pointer hover:bg-white/10 rounded-lg py-2 px-2 mt-5 translate-x-[-8px]">
            <GlobeIcon className="opacity-90  icon" />
            <span className="text-white">
              {router.locale === 'es' ? 'ES 🇪🇸' : router.locale === 'pt' ? 'PT 🇵🇹' : 'EN 🇬🇧'}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-1 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg z-[100000]">
          <div className="flex flex-col">
            <Link
              className="text-white hover:bg-white/10 rounded p-2 transition-colors"
              href={router.asPath}
              locale={false}
              onClick={() => setLanguageOpen(false)}
            >
              English 🇬🇧
            </Link>
            <Link
              className="text-white hover:bg-white/10 rounded p-2 transition-colors"
              href={router.asPath}
              locale="es"
              onClick={() => setLanguageOpen(false)}
            >
              Español 🇪🇸
            </Link>
            <Link
              className="text-white hover:bg-white/10 rounded p-2 transition-colors"
              href={router.asPath}
              locale="pt"
              onClick={() => setLanguageOpen(false)}
            >
              Português 🇵🇹
            </Link>
          </div>
        </PopoverContent>
      </Popover>

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
        <a target="_blank" rel="noreferrer" href="https://github.com/efdevcon/monorepo">
          <GithubIcon style={{ fill: 'white' }} />
        </a>
      </div>
    </div>
  )
}

export const Menu = (props: any) => {
  const router = useRouter()
  const { scrollY } = useScroll()
  const [hasScrolled, setHasScrolled] = React.useState(false)
  const [languageOpen, setLanguageOpen] = React.useState(false)
  const { visible, toggleVisible } = useDevaBotStore()
  React.useEffect(() => {
    return scrollY.onChange(latest => {
      setHasScrolled(latest > 0)
    })
  }, [scrollY])

  return (
    <div
      className={cn(
        css['menu'],
        'flex gap-4 self-start items-center backdrop-blur-sm bg-black/20 rounded-lg p-1.5 lg:p-0 lg:px-2 lg:pr-3 transition-all duration-500 pointer-events-auto',
        hasScrolled && 'bg-black/50'
      )}
    >
      <Mobile menuOpen={props.menuOpen} setMenuOpen={props.setMenuOpen} />

      {menuItems(router.pathname).map((menuItem: any) => {
        const isMultiLink = !!menuItem.children

        if (menuItem.onlyFooter) return null

        if (isMultiLink) {
          return (
            <MultiLink
              className={cn(menuItem.customClass, 'hidden lg:flex')}
              key={menuItem.text}
              to={menuItem.children}
            >
              {menuItem.text}
            </MultiLink>
          )
        }

        return (
          <Link
            className={cn(menuItem.customClass, 'hidden lg:flex')}
            key={menuItem.text}
            href={menuItem.url}
            indicateExternal
          >
            {menuItem.text}
          </Link>
        )
      })}

      {/* <div className={css['social-media']}>
        <a target="_blank" rel="noreferrer" href="https://twitter.com/efdevconnect">
          <TwitterIcon style={{ fill: 'white' }} />
        </a>
        <a target="_blank" rel="noreferrer" href="https://t.me/efdevconnect">
          <TelegramIcon style={{ fill: 'white' }} />
        </a>

        <a target="_blank" rel="noreferrer" href="https://warpcast.com/efdevconnect">
          <FarcasterIcon style={{ fill: 'white' }} />
        </a>

      </div> */}

      <div className="items-center gap-1 hidden lg:flex">
        {/* <div
          className="items-center gap-2 hover:cursor-pointer hover:bg-white/10 rounded-lg p-0.5 px-2 select-none hidden lg:flex"
          onClick={toggleVisible}
        >
          DevAI 🦄
        </div> */}

        <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-2 hover:cursor-pointer hover:bg-white/10 rounded-lg p-0.5 px-2 select-none">
              <GlobeIcon className="opacity-90  icon" />
              <span className="text-white text-base">
                {router.locale === 'es' ? 'ES' : router.locale === 'pt' ? 'PT' : 'ENG'}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg z-[100000]">
            <div className="flex flex-col text-sm">
              <Link
                className="text-white hover:bg-white/10 rounded p-2 pt-1 transition-colors"
                href={router.asPath}
                locale={false}
                onClick={() => setLanguageOpen(false)}
              >
                English 🇬🇧
              </Link>
              <Link
                className="text-white hover:bg-white/10 rounded p-2 pt-1 transition-colors"
                href={router.asPath}
                locale="es"
                onClick={() => setLanguageOpen(false)}
              >
                Español 🇪🇸
              </Link>
              <Link
                className="text-white hover:bg-white/10 rounded p-2 pt-1 transition-colors"
                href={router.asPath}
                locale="pt"
                onClick={() => setLanguageOpen(false)}
              >
                Português 🇵🇹
              </Link>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
