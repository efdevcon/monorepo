import React, { use } from 'react'
import Image from 'next/image'
import { useAccountContext } from 'context/account-context'
import cn from 'classnames'
import { Button } from 'lib/components/button'
// import Portal from 'assets/images/dc-7/portal.png'
import Portal from 'pages/login/dc-7-images/login-backdrop-2.png'
import PhonePreview from 'assets/images/dc-7/phone-preview.png'
import PassportLogoBlack from 'assets/images/dc-7/passport-logo-black.png'
import { NotificationCard } from 'components/domain/app/dc7/profile/notifications'
import { PersonalizedSuggestions } from 'components/domain/app/dc7/sessions/recommendations'
import { useRecoilState, useRecoilValue } from 'recoil'
import { devaBotVisibleAtom, notificationsAtom, sessionsAtom, speakersAtom, useSeenNotifications } from 'pages/_app'
import FoodIcon from 'assets/icons/food-beverage.svg'
import CityGuideIcon from 'assets/icons/city-guide.svg'
import VideoIcon from 'assets/icons/video-play.svg'
import UserProfileIcon from 'assets/icons/user-profile.svg'
import SquareSparkles from 'lib/assets/icons/square-sparkle.svg'
import { useAvatar } from 'hooks/useAvatar'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import AIImage from 'lib/components/ai/ai-generate.png'
import { useDraggableLink } from 'lib/components/link/Link'
import CalendarIcon from 'assets/icons/calendar.svg'
import { Link } from 'components/common/link'
import { TruncateMiddle } from 'utils/formatting'
import ChevronRight from 'assets/icons/chevron_right.svg'
import { FancyLoader } from 'lib/components/loader/loader'
import { RecommendedSpeakers } from '../speakers/recommendations'
import { useSpeakerData } from 'services/event-data'
import { ZupassTickets } from './ticket'

export const cardClass =
  'flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] rounded-3xl relative lg:bg-[#fbfbfb]'

const NotLoggedIn = () => {
  return (
    <div className="shrink max-w-full h-full rounded-2xl shadow-lg md:order-1">
      <div className="flex flex-col relative overflow-hidden rounded-2xl border border-solid border-[#b664ed] bg-white">
        <div className="aspect-[4/2] relative">
          <Image src={Portal} alt="Portal" className="h-full w-full object-cover" quality={100} />
          {/* <Image src={PassportLogo} alt="Passport Logo" className="absolute bottom-2 left-2 w-[40%]" /> */}
          <Image
            src={PhonePreview}
            alt="Phone"
            className="absolute bottom-0 right-0 h-[90%] w-full object-contain object-right"
          />
        </div>
        {/* <div className="flex flex-col gap-2">
          <div className="flex">
            <p className="w-[100%] shrink-0 grow-0 text-sm text-[black] p-4 pb-1 pt-3">
              Login to personalize your schedule, track your favorite speakers, share schedule, and more.
            </p>
          </div>
          <Button className="m-3 mt-0" color="purple-2" fat fill>
            Connect
          </Button>

          <div className="absolute right-0 bottom-0 w-[25%]relative flex justify-center items-end">
            <Image
              src={PhonePreview}
              alt="Phone"
              className="absolute right-0 w-full bottom-0 object-cover"
              width={100}
            />
          </div>
        </div> */}
      </div>
    </div>
  )
}

export const LoggedInCard = ({
  dashboard,
  className,
  children,
}: {
  dashboard?: boolean
  className?: string
  children?: any
}) => {
  const avatar = useAvatar()
  const { account } = useAccountContext()

  return (
    <Link to="/account" className={className}>
      <div
        className={cn(
          'flex items-center justify-between rounded-xl bg-white border border-solid border-[#E1E4EA] p-2 px-4 shrink-0 cursor-pointer hover:border-[#d1c7f7] gap-4 sm:gap-2 transition-all duration-300'
        )}
      >
        <div className="relative flex flex-row items-center gap-1">
          <Image
            // @ts-ignore
            src={avatar.url}
            alt={avatar.name}
            width={48}
            height={48}
            className="rounded-full w-[48px] h-[48px] object-cover"
          />

          <div
            className={cn('flex flex-col p-2')}
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()
            }}
          >
            <p className="text-xs font-semibold">Ethereum</p>
            <div className="text-sm text-[#717784] mb-0">
              {account?.addresses[0] ? TruncateMiddle(account?.addresses[0], 8) : account?.email}
            </div>
            <p className="text-xs text-[#7d52f4] font-semibold">Connected</p>
          </div>
        </div>

        {dashboard ? <ChevronRight className="text-xs icon mx-4" style={{ '--color-icon': '#7d52f4' }} /> : children}
      </div>
    </Link>
  )
}

const LoggedIn = () => {
  const { account } = useAccountContext()

  return (
    <div className="px-4 flex flex-col lg:flex-row justify-between lg:items-center sm:flex-row gap-4">
      <div>
        <div className="font-semibold text-xl">
          ยินดีต้อนรับ <span className="text-[#7d52f4] italic">(yin-dee ton-rap)</span>
        </div>
        <div className="text-lg font-semibold">
          {account?.username ? `Welcome, ${account?.username}!` : 'Welcome!'} 👋
        </div>
        <p className="text-xs text-[#505050] mt-1">
          Thank you for connecting to the Devcon Passport - have a wonderful Devcon.
        </p>
      </div>

      <LoggedInCard dashboard className="lg:min-w-[350px] lg:max-w-[50%]" />
    </div>
  )
}

const Notifications = () => {
  const notifications = useRecoilValue(notificationsAtom)
  const { seenNotifications, markAllAsRead, notificationsCount } = useSeenNotifications()

  return (
    <div className="px-4 flex flex-col lg:flex-row gap-2 mb-4 [&>*:not(:first-child)]:hidden lg:[&>*:not(:first-child)]:flex">
      {notifications.map(n => (
        <NotificationCard key={n.id} notification={n} seen={seenNotifications.has(n.id)} />
      ))}
    </div>
  )
}

const featuredClass =
  'text-center flex flex-col gap-3 group items-center rounded-2xl justify-between border border-solid border-[#E4E6EB] p-4 text-white shadow cursor-pointer text-sm shrink-0 w-[230px] max-w-[60%]'

export const Dashboard = () => {
  const accountContext = useAccountContext()
  const sessions = useRecoilValue(sessionsAtom)
  const speakers = useSpeakerData()
  const draggableLink = useDraggableLink()
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const { account, loading } = accountContext

  return (
    <div className={cn(cardClass, 'lg:py-4 col-start-1 col-end-4')}>
      {loading && !account && (
        <>
          <div className="flex justify-center items-center h-full">
            <FancyLoader loading={loading} size={60} />
          </div>
        </>
      )}
      {!loading && account && <LoggedIn />}
      {!loading && !account && (
        <div className="flex justify-between md:items-center gap-6 flex-col md:flex-row px-4 relative">
          <NotLoggedIn />
          <div className="flex flex-col gap-2 my-2 md:w-[50%] w-full md:order-2 order-1 shrink-0">
            <Image src={PassportLogoBlack} alt="Passport Logo" className="object-contain w-[200px] filter-invert" />
            <div className="text-xl font-semibold mt-2">
              Connect to personalize your schedule, track your favorite speakers, share schedule, and more.
            </div>
            <div className="text-sm text-[#474747]">
              Devcon Passport App is designed to be utilized on a mobile device. Please install as a PWA on your device
              for the best experience.
            </div>
            <Link to="/login" className="mt-2 sm:max-w-[250px] w-full relative">
              <Button color="purple-2" className="w-full" fat fill>
                Connect
              </Button>
            </Link>
          </div>
        </div>
      )}
      <div className="flex justify-between gap-3 pb-4 mx-4 font-semibold border-top py-4 mt-4">
        Notifications
        <div
          onClick={() => setDevaBotVisible('tab:notifications')}
          className="shrink-0 select-none cursor-pointer mr-2 rounded-full bg-white border border-solid border-[#E1E4EA] px-3 py-1 text-xs flex items-center justify-center text-[#717784] hover:text-black transition-all duration-300"
        >
          <p>Go to Notifications</p>
        </div>
      </div>
      <Notifications />
      <div className="flex gap-3 pb-4 mx-4 justify-between font-semibold border-top py-4">
        <div>Featured</div>
      </div>
      <div
        className="overflow-hidden mb-6"
        // style={{ maskImage: 'linear-gradient(to right, black 95%, transparent)' }}
      >
        <SwipeToScroll /*scrollIndicatorDirections={{ right: true }}*/>
          {/* @ts-ignore */}
          <div className="flex no-wrap gap-2 ml-4" data-type="featured-swiper" style={{ '--color-icon': 'white' }}>
            <div
              {...draggableLink}
              onClick={(e: any) => {
                setDevaBotVisible(true)
                e.stopPropagation()
                e.preventDefault()
              }}
              className={cn(featuredClass, 'bg-gradient-to-br from-[#CA6FFF] via-[#5267F8] to-[#ac56fd]')}
            >
              {/* <Image src={AIImage} alt="Square Sparkles" /> */}
              <p className="text-white font-semibold">Ask Deva</p>
              <SquareSparkles
                className="group-hover:scale-110 transition-transform duration-300 icon"
                style={{ fontSize: '28px' }}
              />
              <div className="text-xs">Unlock the power of prompts, ask Deva any questions related to Devcon.</div>
            </div>
            <Link
              {...draggableLink}
              to={accountContext?.account ? '/account' : '/login'}
              className={cn(featuredClass, 'bg-gradient-to-br from-[#4d56ff] via-[#4799f2] to-[#3467ff]')}
            >
              <p className="text-white font-semibold">Personalization</p>
              <UserProfileIcon
                className="group-hover:scale-110 transition-transform duration-300 icon"
                style={{ fontSize: '28px' }}
              />
              <div className="text-xs">Customize your Devcon experience by editing your preferences.</div>
            </Link>

            <Link
              {...draggableLink}
              to="https://devcon.org/experiences"
              className={cn(featuredClass, 'bg-gradient-to-br from-[#e19c79] via-[#f95175] to-[#ef4f72]')}
            >
              <p className="text-white font-semibold">Experiences</p>
              <VideoIcon
                className="group-hover:scale-110 transition-transform duration-300 icon"
                style={{ fontSize: '28px' }}
              />
              <div className="text-xs">Looking for a little fun? Check out amazing unique experiences at devcon.</div>
            </Link>

            <Link
              {...draggableLink}
              to="https://devcon.org/city-guide"
              className={cn(featuredClass, 'bg-gradient-to-br from-[#FF8864] via-[#E55066] to-[#f2782c]')}
            >
              <p className="text-white  font-semibold">City Guide</p>
              <CityGuideIcon
                className="group-hover:scale-110 transition-transform duration-300 icon"
                style={{ fontSize: '28px' }}
              />
              <div className="text-xs">Find your way around Bangkok with our city guide.</div>
            </Link>

            <Link
              {...draggableLink}
              to="https://devcon.org/devcon-week"
              className={cn(featuredClass, 'bg-gradient-to-br from-[#6C6A77] via-[#252525] to-[#313131] mr-4')}
            >
              <p className="text-white  font-semibold">Devcon Week</p>
              <CalendarIcon
                className="group-hover:scale-110 transition-transform duration-300 icon"
                style={{ fontSize: '28px' }}
              />
              <div className="text-xs">
                Devcon may be only 4 days long. But there is a week full of Ethereum Events.
              </div>
            </Link>

            {/* <div className={cn(featuredClass, 'bg-gradient-to-br from-[#6C6A77] via-[#252525] to-[#313131] mr-4')}>
              <p className="text-white font-semibold">Food & Beverage</p>
              <FoodIcon style={{ fontSize: '28px' }} />
              <div>View event menu items and dietary information.</div>
            </div> */}
          </div>
        </SwipeToScroll>
      </div>
      <div className="pb-4 mx-4 border-top"></div>
      <div>
        <RecommendedSpeakers speakers={speakers ?? []} standalone />
      </div>
      <div className="pb-4 mx-4 mt-6 border-top"></div>
      <div className="">
        <PersonalizedSuggestions sessions={sessions || []} standalone />
      </div>

      {/* <ZupassTickets className="flex flex-col md:flex-row justify-between gap-4 items-stretch mt-4 border-top pt-4 mx-4 relative" /> */}
    </div>
  )
}
