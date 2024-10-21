import React, { PropsWithChildren, useState, useEffect, useRef, RefObject } from 'react'
// import { BottomNav } from 'components/domain/app/navigation'
import css from './app.module.scss'
// import { Header } from 'components/common/layouts/header'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import useGetElementHeight from 'hooks/useGetElementHeight'
import AppIcon from 'assets/icons/app-icons-1.svg'
import SpeakerIcon from 'assets/icons/speaker.svg'
import CalendarFillIcon from 'assets/icons/calendar-fill.svg'
import TicketIcon from 'assets/icons/ticket-2.svg'
import FolderIcon from 'assets/icons/folder.svg'
import TilesIcon from 'assets/icons/app-tiles.svg'
import cn from 'classnames'
import { usePathname } from 'next/navigation'
import AppIcons from 'assets/icons/app-icons.svg'
import SunCloudy from 'assets/images/dc-7/sun-cloudy.png'
import Image from 'next/image'
import BellIcon from 'assets/icons/bell-simple.svg'
import ThreeDotsIcon from 'assets/icons/three-dots.svg'
import UserIcon from 'assets/icons/user.svg'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Popover, PopoverContent, PopoverTrigger, PopoverArrow } from '@/components/ui/popover'
import DevaBot from 'lib/components/ai/overlay'
import { useRecoilState, useRecoilValue } from 'recoil'
import { devaBotVisibleAtom, notificationsAtom, notificationsCountSelector, useSeenNotifications } from 'pages/_app'
import LoginBackdrop from 'pages/login/dc-7-images/login-backdrop-2.png'

type HeaderProps = {
  breadcrumbs: {
    label: string
    href?: string
    icon?: any
  }[]
  pageTitle: string
}

const LocationInformation = ({ className }: { className: string }) => {
  const [countdown, setCountdown] = useState('')
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const targetDate = new Date('2024-11-12T09:00:00+07:00') // Bangkok time (UTC+7)

    const updateCountdown = () => {
      const now = new Date()
      const difference = targetDate.getTime() - now.getTime()

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`)
      } else {
        setCountdown('Event started!')
      }
    }

    const updateCurrentTime = () => {
      const now = new Date()
      const bangkokTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Bangkok',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(now)
      setCurrentTime(bangkokTime + ' Bangkok (GMT-7)')
    }

    updateCountdown() // Initial call
    updateCurrentTime() // Initial call
    const timer = setInterval(updateCountdown, 1000) // Update every minute
    const timeTimer = setInterval(updateCurrentTime, 60000) // Update every minute

    return () => {
      clearInterval(timer)
      clearInterval(timeTimer)
    } // Cleanup on unmount
  }, [])

  return (
    <div className={className}>
      <div className="flex items-center justify-center gap-2">
        <Image src={SunCloudy} alt="sun-cloudy" width={24} height={24} />
        <div className="text-lg font-semibold">32°C</div>
      </div>
      <div className="text-[#6a6e76] text-[13px]">{currentTime}</div>
      <div className="text-[#6a6e76] text-[13px] hidden xl:block">{countdown}</div>
    </div>
  )
}

const Header = (props: HeaderProps & { layoutContainerRef: RefObject<HTMLDivElement> }) => {
  const { scrollY } = useScroll({
    container: props.layoutContainerRef,
  })
  const opacity = useTransform(scrollY, [0, 50], [0, 1])
  const textColor = useTransform(scrollY, [0, 50], ['#ffffff', '#000000'])
  // const iconColor = useTransform(scrollY, [0, 50], ['#ffffff', '#000000'])

  return (
    <>
      <motion.div className="section z-[12] sticky top-0 inset-padding-top" style={{ color: textColor }}>
        <div className="flex justify-between items-center min-h-[56px] w-full gap-8">
          <motion.div className="absolute inset-0 bg-white h-full glass z-[-1]" style={{ opacity }}></motion.div>

          <div className="lg:w-[60px] flex w-[20px] justify-center items-center text-xl shrink-0">
            <AppIcon style={{ fontSize: 20, '--icon-color': textColor }} />
          </div>

          <div className="flex gap-6 items-center grow shrink-0">
            <div className="text-2xl">{props.pageTitle}</div>

            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList className="lg:text-sm">
                {props.breadcrumbs.map((breadcrumb, index) => {
                  let label = breadcrumb.label as any

                  if (breadcrumb.icon) {
                    label = <breadcrumb.icon className="icon" />
                  }

                  return (
                    <React.Fragment key={index}>
                      <BreadcrumbItem>
                        {breadcrumb.href ? (
                          <BreadcrumbLink href={breadcrumb.href} className="cursor-pointer">
                            {index === props.breadcrumbs.length - 1 ? (
                              <span className="font-semibold flex items-center">{breadcrumb.label}</span>
                            ) : (
                              label
                            )}
                          </BreadcrumbLink>
                        ) : (
                          <span
                            className={
                              index === props.breadcrumbs.length - 1 ? 'flex items-center' : 'flex items-center'
                            }
                          >
                            {label}
                          </span>
                        )}
                      </BreadcrumbItem>
                      {index < props.breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center justify-center gap-6 shrink-0">
            <LocationInformation className="hidden sm:flex items-center justify-center gap-6" />

            <div className="flex items-center justify-center gap-4 ml-4 user-select-none">
              <Link href="/login">
                <BellIcon
                  className="cursor-pointer hover:scale-110 transition-all duration-300"
                  style={{ width: 18, height: 18 }}
                />
              </Link>

              <Link href="/login">
                <UserIcon
                  className="cursor-pointer hover:scale-110 transition-all duration-300"
                  style={{ width: 18, height: 18 }}
                />
              </Link>
              <ThreeDotsIcon
                className="cursor-pointer hover:scale-110 transition-all duration-300"
                style={{ width: 18, height: 18 }}
              />
            </div>
          </div>
        </div>
      </motion.div>
      <LocationInformation className="flex sm:hidden items-center justify-center px-5 gap-6 border-top py-2 bg-white z-[11] relative" />
    </>
  )
}

const navItems = [
  {
    icon: TilesIcon,
    label: 'Dashboard',
    href: '/',
    size: 16,
  },
  {
    icon: UserIcon,
    label: 'Account',
    href: '/account',
    size: 18,
  },
  {
    icon: TicketIcon,
    label: 'Venue',
    href: '/venue',
    size: 18,
  },
  {
    label: 'Speakers',
    icon: SpeakerIcon,
    href: '/speakers',
    size: 18,
  },
]

const useWindowWidth = () => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowWidth
}

const Navigation = () => {
  const pathname = usePathname()
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const windowWidth = useWindowWidth()
  const isSmallScreen = windowWidth < 1280
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  // const notificationsCount = useRecoilValue(notificationsCountSelector)
  const { notificationsCount } = useSeenNotifications()

  return (
    <div
      className={cn(
        'self-start flex items-end justify-center shrink-0 gap-4 user-select-none h-full fixed bottom-6 left-0 grow-0 w-full z-10 pointer-events-none inset-padding-bottom',
        'xl:order-1 xl:justify-start xl:w-[0px] xl:flex-col xl:bottom-4 xl:left-auto xl:relative xl:items-center'
      )}
    >
      <div className="flex xl:hidden absolute left-0 -bottom-6 h-[112px] w-full bottom-glass"></div>
      <div className="sticky top-[80px] flex gap-4 flex-row xl:flex-col items-center xl:-translate-x-[50%] xl:w-[60px] pointer-events-auto">
        <div className="flex xl:flex-col gap-4 rounded-full h-[50px] xl:h-auto xl:w-[60px] justify-center items-center xl:py-2 px-2 glass-buttons border border-solid border-[#E1E4EA] border-opacity-50 shadow">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href

            return (
              <Popover
                key={index}
                open={openPopover === item.label}
                onOpenChange={open => setOpenPopover(open ? item.label : null)}
              >
                <PopoverTrigger className="plain outline-none cursor-pointer">
                  <Link
                    href={item.href}
                    onMouseEnter={() => setOpenPopover(item.label)}
                    onMouseLeave={() => setOpenPopover(null)}
                    className={cn(
                      'flex shrink-0 items-center xl:w-[40px] xl:h-[40px] w-[38px] h-[38px] justify-center text-xl cursor-pointer rounded-full p-2.5 hover:bg-[#EFEBFF] transition-all duration-300',
                      isActive && 'bg-[#EFEBFF] fill-[#633CFF]'
                    )}
                  >
                    <item.icon style={isActive ? { fill: '#633CFF', fontSize: item.size } : { fontSize: item.size }} />
                  </Link>
                </PopoverTrigger>

                <PopoverContent
                  className="w-auto p-1 text-sm px-2"
                  side={isSmallScreen ? 'top' : 'left'}
                  sideOffset={isSmallScreen ? 15 : 20}
                >
                  <div>{item.label}</div>
                  {/* <PopoverArrow style={{ fill: 'white' }} /> */}
                </PopoverContent>
              </Popover>
            )
          })}
        </div>

        <Popover open={openPopover === '/schedule'} onOpenChange={open => setOpenPopover(open ? '/schedule' : null)}>
          <PopoverTrigger className="plain outline-none">
            <Link
              href="/schedule"
              onMouseEnter={() => setOpenPopover('/schedule')}
              onMouseLeave={() => setOpenPopover(null)}
              className="shadow glass-buttons cursor-pointer flex flex-col gap-4 rounded-full justify-center items-center xl:w-[60px] xl:h-[60px] w-[50px] h-[50px] bg-[#E1E4EA73] bg-opacity-50 transition-all duration-300 hover:bg-[#EFEBFF] border border-solid border-[#E1E4EA] border-opacity-50"
            >
              <CalendarFillIcon style={{ fontSize: 20 }} />
            </Link>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-1 text-sm px-2" side={isSmallScreen ? 'top' : 'left'} sideOffset={10}>
            <div>Schedule</div>
            {/* <PopoverArrow className="shadow-lg" style={{ fill: 'white' }} /> */}
          </PopoverContent>
        </Popover>

        <Popover open={openPopover === '/more'} onOpenChange={open => setOpenPopover(open ? '/more' : null)}>
          <PopoverTrigger className="plain outline-none" onClick={() => setDevaBotVisible(true)}>
            <div
              // href="/more"
              onMouseEnter={() => setOpenPopover('/more')}
              onMouseLeave={() => setOpenPopover(null)}
              className="shadow glass-buttons cursor-pointer flex flex-col gap-4 rounded-full justify-center items-center xl:w-[60px] xl:h-[60px] w-[50px] h-[50px] bg-[#784DEF1A] bg-opacity-20 transition-all duration-300 hover:bg-[#EFEBFF] border border-solid border-[#E1E4EA]"
            >
              <AppIcons style={{ fontSize: 40 }} />

              {notificationsCount > 0 && (
                <div className="absolute -top-[1px] -right-[1.5px] bg-[#7D52F4] text-white rounded-full w-5 h-5 md:w-[1.1rem] md:h-[1.1rem] lg:-top-0.5 lg:-right-0.5 flex items-center justify-center text-xs lg:text-[12px]">
                  {notificationsCount}
                </div>
              )}
            </div>
          </PopoverTrigger>

          {/* #7D52F4 */}

          <PopoverContent className="w-auto p-1 text-sm px-2" side={isSmallScreen ? 'top' : 'left'} sideOffset={10}>
            <div>Ask Deva</div>
            {/* <PopoverArrow style={{ fill: 'white' }} /> */}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

export const AppLayout = (
  props: {
    showLogin?: boolean
    pageTitle: string
    breadcrumbs: { label: string; href?: string; icon?: any }[]
  } & PropsWithChildren
) => {
  const headerHeight = useGetElementHeight('header')
  const upperNavHeight = useGetElementHeight('inline-nav')
  const lowerNavHeight = useGetElementHeight('bottom-nav')
  const layoutContainerRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <div
        id="layout-container"
        className={css['app']}
        ref={layoutContainerRef}
        style={
          {
            '--header-height': `${headerHeight}px`,
            '--app-nav-upper-height': `${upperNavHeight || 49}px`,
            '--app-nav-lower-height': `${lowerNavHeight}px`,
          } as any
        }
      >
        <Header pageTitle={props.pageTitle} breadcrumbs={props.breadcrumbs} layoutContainerRef={layoutContainerRef} />

        <Image
          src={LoginBackdrop}
          alt="Login Backdrop"
          className={cn(
            'object-cover absolute inset-0 h-full w-full -translate-y-[16vh] lg:translate-y-0 pointer-events-none z-[1] blur-lg'
          )}
          quality={100}
          priority
        />

        <div className="section pt-5 bg-white relative z-10 page-background">
          <div className="flex flex-col xl:flex-row gap-0 relative">
            <div data-type="page-content" className="xl:order-2 grow relative px-4 pb-24 min-h-[50vh] shrink-0">
              {props.children}
            </div>
            <Navigation />
          </div>
        </div>
      </div>
    </>
  )
}
