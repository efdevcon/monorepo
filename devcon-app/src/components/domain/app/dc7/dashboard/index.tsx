import React, { use } from 'react'
import Image from 'next/image'
import { useAccountContext } from 'context/account-context'
import cn from 'classnames'
import { Button } from 'lib/components/button'
// import Portal from 'assets/images/dc-7/portal.png'
import Portal from 'pages/login/dc-7-images/login-backdrop-2.png'
import PhonePreview from 'assets/images/dc-7/phone-preview.png'
import PassportLogo from 'assets/images/dc-7/passport-logo.png'
import PassportLogoBlack from 'assets/images/dc-7/passport-logo-black.png'
import { NotificationCard } from 'components/domain/app/dc7/profile/notifications'
import { SessionCard, PersonalizedSuggestions, tagClass } from 'components/domain/app/dc7/sessions'
import { useRecoilState, useRecoilValue } from 'recoil'
import { devaBotVisibleAtom, notificationsAtom, sessionsAtom, useSeenNotifications } from 'pages/_app'
import FoodIcon from 'assets/icons/food-beverage.svg'
import CityGuideIcon from 'assets/icons/city-guide.svg'
import VideoIcon from 'assets/icons/video-play.svg'
import UserProfileIcon from 'assets/icons/user-profile.svg'
import SquareSparkles from 'lib/assets/icons/square-sparkle.svg'
import { useAvatar } from 'hooks/useAvatar'
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll'
import AIImage from 'lib/components/ai/ai-generate.png'
import { useDraggableLink } from 'lib/components/link/Link'
import { Link } from 'components/common/link'

export const cardClass =
  'flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] rounded-3xl relative lg:bg-[#fbfbfb]'

const NotLoggedIn = () => {
  return (
    <div className="shrink max-w-full h-full rounded-2xl shadow-lg md:order-1">
      <div className="flex flex-col relative overflow-hidden rounded-2xl border border-solid border-[#b664ed] bg-white">
        <div className="aspect-[4/2] relative">
          <Image src={Portal} alt="Portal" className="h-full w-full object-cover" quality={100} />
          <Image src={PassportLogo} alt="Passport Logo" className="absolute bottom-2 left-2 w-[40%]" />
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

const LoggedInCard = () => {
  const avatar = useAvatar()
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-xl bg-white border border-solid border-[#E1E4EA] p-2 shrink-0 cursor-pointer hover:border-[#ac9fdf] transition-all duration-300'
      )}
    >
      <div className="relative flex flex-row items-center gap-4">
        <Image
          // @ts-ignore
          src={avatar.url}
          alt={avatar.name}
          width={48}
          height={48}
          className="rounded-full w-[48px] h-[48px] object-cover"
        />
      </div>

      <div
        className={cn('flex items-center justify-center p-2 hover:scale-110 transition-transform duration-300')}
        onClick={e => {
          e.stopPropagation()
          e.preventDefault()
        }}
      >
        Connected
      </div>
    </div>
  )
}

const LoggedIn = () => {
  const { account } = useAccountContext()

  return (
    <div className="lg:px-4 flex justify-between items-center">
      <div className="flex flex-col gap-0">
        <div className="font-semibold text-lg">ยินดีต้อนรับ (yin-dee ton-rap)</div>
        <div className="text-lg font-semibold">Hello, {account?.username || 'Anon'}</div>
      </div>

      <LoggedInCard />
    </div>
  )
}

const Notifications = () => {
  const notifications = useRecoilValue(notificationsAtom)
  const { seenNotifications, markAllAsRead, notificationsCount } = useSeenNotifications()

  return (
    <div className="lg:px-4 flex flex-col lg:flex-row gap-2 mb-4 ">
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
  const draggableLink = useDraggableLink()
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)
  const loggedIn = accountContext.account

  return (
    <div className={cn(cardClass, 'lg:py-4')}>
      {loggedIn ? (
        <LoggedIn />
      ) : (
        <div className="flex justify-between md:items-center gap-6 flex-col md:flex-row lg:px-4 relative">
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
            <Link to="/login" className="mt-2 max-w-[250px] relative">
              <Button color="purple-2" className="w-full" fat fill>
                Connect
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* <div className="flex gap-3 pb-4 lg:mx-4 font-semibold border-top py-4 mt-4">Notifications</div>
      <Notifications /> */}

      <div className="flex gap-3 pb-4 lg:mx-4 font-semibold border-top py-4 mt-4">Featured</div>

      <div className="lg:overflow-hidden mb-6">
        <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
          {/* @ts-ignore */}
          <div className="flex no-wrap gap-2 lg:ml-4" data-type="featured-swiper" style={{ '--color-icon': 'white' }}>
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
              <p className="text-white font-semibold">AI Assistant</p>
              <SquareSparkles
                className="group-hover:scale-110 transition-transform duration-300 icon"
                style={{ fontSize: '28px' }}
              />
              <div className="text-xs">Unlock the power of prompts, ask Deva any questions related to Devcon.</div>
            </div>
            <Link
              {...draggableLink}
              to="/login"
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

            <div className={cn(featuredClass, 'bg-gradient-to-br from-[#6C6A77] via-[#252525] to-[#313131] pr-4')}>
              <p className="text-white text-lg font-semibold">Food & Beverage</p>
              <FoodIcon style={{ fontSize: '28px' }} />
              <div>View event menu items and dietary information.</div>
            </div>
          </div>
        </SwipeToScroll>
      </div>

      <div className="pb-4 lg:mx-4 border-top"></div>

      <PersonalizedSuggestions sessions={sessions || []} />
    </div>
  )
}
