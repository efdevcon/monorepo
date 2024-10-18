import React, { PropsWithChildren, useState, useEffect } from 'react'
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
      setCurrentTime(bangkokTime + ', Bangkok (GMT-7)')
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
      <div className="text-[#99A0AE] font-semibold text-[13px]">{currentTime}</div>
      <div className="text-[#99A0AE] font-semibold text-[13px]">{countdown}</div>
    </div>
  )
}

const Header = (props: HeaderProps) => {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, 50], [0, 1])

  return (
    <>
      <div className="section z-10 sticky top-0">
        <div className="flex justify-between items-center min-h-[56px] w-full gap-8">
          <motion.div className="absolute inset-0 bg-white h-full glass z-[-1]" style={{ opacity }}></motion.div>

          <div className="lg:w-[60px] flex w-[20px] justify-center items-center text-xl shrink-0">
            <AppIcon />
          </div>

          <div className="flex gap-6 items-center grow shrink-0">
            <div className="text-xl font-semibold">{props.pageTitle}</div>

            <Breadcrumb className="hidden lg:flex">
              <BreadcrumbList className="text-xl lg:text-sm">
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
            <LocationInformation className="hidden lg:flex items-center justify-center gap-6" />

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
      </div>
    </>
  )
}

const navItems = [
  {
    icon: TilesIcon,
    href: '/',
    size: 16,
  },
  {
    icon: FolderIcon,
    href: '/schedule',
    size: 18,
  },
  {
    icon: TicketIcon,
    href: '/ticket',
    size: 18,
  },
  {
    label: '',
    icon: SpeakerIcon,
    href: '/speakers',
    size: 18,
  },
]

const Navigation = () => {
  const pathname = usePathname()

  return (
    <div
      className={cn(
        'self-start flex items-end justify-center shrink-0 gap-4 user-select-none h-full fixed bottom-4 left-0 grow-0 w-full',
        'lg:order-1 lg:justify-start lg:w-[0px] lg:flex-col lg:bottom-4 lg:left-auto lg:relative lg:items-center'
      )}
    >
      <div className="sticky top-[80px] flex gap-4 flex-row lg:flex-col items-center lg:-translate-x-[50%] lg:w-[60px]">
        <div className="flex lg:flex-col gap-4 rounded-full h-[50px] lg:h-auto lg:w-[60px] justify-center items-center lg:py-2 px-2 glass-buttons border border-solid border-[#E1E4EA] border-opacity-50 shadow">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center lg:w-[40px] lg:h-[40px] w-[38px] h-[38px] justify-center text-xl cursor-pointer rounded-full p-2.5 hover:bg-[#EFEBFF] transition-all duration-300',
                  isActive && 'bg-[#EFEBFF] fill-[#633CFF]'
                )}
              >
                <item.icon style={isActive ? { fill: '#633CFF', fontSize: item.size } : { fontSize: item.size }} />
              </Link>
            )
          })}
        </div>

        <Link
          href="/schedule"
          className="shadow glass-buttons cursor-pointer flex flex-col gap-4 rounded-full justify-center items-center lg:w-[60px] lg:h-[60px] w-[50px] h-[50px] bg-[#E1E4EA73] bg-opacity-50 transition-all duration-300 hover:bg-[#EFEBFF] border border-solid border-[#E1E4EA] border-opacity-50"
        >
          <CalendarFillIcon style={{ fontSize: 20 }} />
        </Link>

        <Link
          href="/schedule"
          className="shadow glass-buttons cursor-pointer flex flex-col gap-4 rounded-full justify-center items-center lg:w-[60px] lg:h-[60px] w-[50px] h-[50px] bg-[#E1E4EA] bg-opacity-20 transition-all duration-300 hover:bg-[#EFEBFF] border border-solid border-[#E1E4EA] border-opacity-50"
        >
          <AppIcons style={{ fontSize: 40 }} />
        </Link>
      </div>
    </div>
  )
}

export const AppLayout = (
  props: { pageTitle: string; breadcrumbs: { label: string; href?: string; icon?: any }[] } & PropsWithChildren
) => {
  const headerHeight = useGetElementHeight('header')
  const upperNavHeight = useGetElementHeight('inline-nav')
  const lowerNavHeight = useGetElementHeight('bottom-nav')

  return (
    <>
      <div
        className={css['app']}
        style={
          {
            '--header-height': `${headerHeight}px`,
            '--app-nav-upper-height': `${upperNavHeight || 49}px`,
            '--app-nav-lower-height': `${lowerNavHeight}px`,
          } as any
        }
      >
        <Header pageTitle={props.pageTitle} breadcrumbs={props.breadcrumbs} />

        <div className="section pt-5">
          <div className="flex flex-col lg:flex-row gap-0 relative">
            <div data-type="page-content" className="lg:order-2 grow relative px-4">
              {props.children}
            </div>
            <Navigation />
          </div>
        </div>
      </div>
    </>
  )
}
