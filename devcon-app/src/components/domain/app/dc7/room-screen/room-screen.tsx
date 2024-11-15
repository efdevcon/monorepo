import React from 'react'
import css from './room-screen.module.scss'
import { Room as RoomType } from 'types/Room'
import { Session } from 'types/Session'
import { useAppContext } from 'context/app-context'
import QRCode from 'react-qr-code'
// import { getTrackImage, getTrackID } from 'components/domain/index/track-list/TrackList'
import IconClock from 'assets/icons/clock.svg'
import IconPeople from 'assets/icons/people.svg'
import moment from 'moment'
// import { usePanzoom, PanzoomControls } from 'components/domain/app/venue/Venue'
// import venueCss from 'components/domain/app/venue/venue.module.scss'
// import { getFloorImage } from 'components/domain/app/venue/Floor'
import Image from 'next/image'
import CLS from './thank-you-bg.png'
import DevconLogo from 'assets/images/dc-7/logo-flowers.png'
import {
  SessionCardPercentual,
  getExpertiseColor,
  getTrackColor,
  // getTrackLogo,
} from 'components/domain/app/dc7/sessions'
import makeBlockie from 'ethereum-blockies-base64'
// import { Room } from '../venue'
import FloorBasement from 'assets/images/dc-7/venue/venue-map.png'
import Floor1 from 'assets/images/dc-7/venue/venue-map.png'
import Floor2 from 'assets/images/dc-7/venue/venue-map.png'
import Floor3 from 'assets/images/dc-7/venue/venue-map.png'
import Floor4 from 'assets/images/dc-7/venue/venue-map.png'
import Floor5 from 'assets/images/dc-7/venue/venue-map.png'
import Stage12 from 'assets/images/dc-7/venue/stages/stage-1-2.png'
import Stage34 from 'assets/images/dc-7/venue/stages/stage-3-4.png'
import Stage56 from 'assets/images/dc-7/venue/stages/main-stage.png'
import cn from 'classnames'
import { notificationsAtom, sessionsAtom } from 'pages/_app'
import { useRecoilState, useRecoilValue } from 'recoil'
import NoResults from 'assets/images/state/no-results.png'
import InfiniteScroll from 'lib/components/infinite-scroll/infinite-scroll'
import CoreProtocol from 'assets/images/dc-7/venue/tracks-hd/core.png'
import Cypherpunk from 'assets/images/dc-7/venue/tracks-hd/cypher.png'
import Usability from 'assets/images/dc-7/venue/tracks-hd/usability.png'
import RealWorldEthereum from 'assets/images/dc-7/venue/tracks-hd/rwe.png'
import AppliedCryptography from 'assets/images/dc-7/venue/tracks-hd/applied.png'
import CryptoEconomics from 'assets/images/dc-7/venue/tracks-hd/crypto.png'
import Coordination from 'assets/images/dc-7/venue/tracks-hd/coordination.png'
import DeveloperExperience from 'assets/images/dc-7/venue/tracks-hd/developer.png'
import Security from 'assets/images/dc-7/venue/tracks-hd/security.png'
import Layer2 from 'assets/images/dc-7/venue/tracks-hd/layer2.png'
// import LogoSimple from 'assets/images/dc-7/venue/logo-simple.svg'
// import { Button } from 'lib/components/button'
// const trackID = getTrackID(props.track)

export const getTrackLogo = (track: string) => {
  let trackLogo = CoreProtocol

  if (track === 'Core Protocol') {
    trackLogo = CoreProtocol
  }
  if (track === 'Cypherpunk & Privacy') {
    trackLogo = Cypherpunk
  }
  if (track === 'Usability') {
    trackLogo = Usability
  }
  if (track === 'Real World Ethereum') {
    trackLogo = RealWorldEthereum
  }
  if (track === 'Applied Cryptography') {
    trackLogo = AppliedCryptography
  }
  if (track === 'Cryptoeconomics') {
    trackLogo = CryptoEconomics
  }
  if (track === 'Coordination') {
    trackLogo = Coordination
  }
  if (track === 'Developer Experience') {
    trackLogo = DeveloperExperience
  }
  if (track === 'Security') {
    trackLogo = Security
  }
  if (track === 'Layer 2') {
    trackLogo = Layer2
  }
  // if (track === 'Experiences' || track === 'Entertainment') {
  //   trackLogo = Entertainment
  // }

  return trackLogo
}

const LogoSimple = () => (
  <svg width="125" height="13" viewBox="0 0 95 9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4.07966 3.88693C4.44028 3.95416 4.73672 4.13447 4.96898 4.42785C5.20125 4.72124 5.31738 5.05741 5.31738 5.43636C5.31738 5.77864 5.23181 6.08119 5.06067 6.34402C4.89564 6.60073 4.65421 6.80243 4.33637 6.94912C4.01854 7.09581 3.64264 7.16916 3.20868 7.16916H0.449038V0.769723H3.08949C3.52346 0.769723 3.8963 0.840013 4.20802 0.980593C4.52585 1.12117 4.76423 1.31676 4.92314 1.56736C5.08817 1.81796 5.17069 2.10217 5.17069 2.42001C5.17069 2.79285 5.06983 3.10457 4.86813 3.35517C4.67254 3.60577 4.40972 3.78302 4.07966 3.88693ZM1.73259 3.41018H2.90613C3.21174 3.41018 3.44705 3.34294 3.61208 3.20848C3.77711 3.0679 3.85963 2.86925 3.85963 2.61254C3.85963 2.35583 3.77711 2.15718 3.61208 2.0166C3.44705 1.87602 3.21174 1.80573 2.90613 1.80573H1.73259V3.41018ZM3.02532 6.12398C3.33704 6.12398 3.57847 6.05063 3.74961 5.90394C3.92686 5.75725 4.01549 5.54944 4.01549 5.2805C4.01549 5.00545 3.9238 4.79153 3.74044 4.63872C3.55707 4.47981 3.30953 4.40035 2.99781 4.40035H1.73259V6.12398H3.02532ZM10.2644 5.94978H7.71559L7.29385 7.16916H5.94612L8.24735 0.760554H9.74177L12.043 7.16916H10.6861L10.2644 5.94978ZM9.91597 4.92294L8.98998 2.24581L8.06398 4.92294H9.91597ZM18.3766 7.16916H17.0931L14.1867 2.77757V7.16916H12.9032V0.760554H14.1867L17.0931 5.16131V0.760554H18.3766V7.16916ZM24.1008 2.69505C23.9541 2.42612 23.7524 2.22136 23.4957 2.08078C23.239 1.9402 22.9395 1.86991 22.5972 1.86991C22.2183 1.86991 21.8821 1.95548 21.5887 2.12662C21.2953 2.29776 21.0661 2.54225 20.9011 2.86008C20.7361 3.17792 20.6536 3.54465 20.6536 3.96027C20.6536 4.38812 20.7361 4.76097 20.9011 5.0788C21.0722 5.39663 21.3076 5.64112 21.6071 5.81226C21.9066 5.9834 22.2549 6.06897 22.6522 6.06897C23.1412 6.06897 23.5416 5.94061 23.8533 5.6839C24.165 5.42108 24.3698 5.05741 24.4676 4.59288H22.2672V3.61188H25.7328V4.73041C25.6472 5.17659 25.4638 5.58916 25.1827 5.96812C24.9015 6.34707 24.5378 6.65268 24.0917 6.88494C23.6516 7.11109 23.1565 7.22417 22.6064 7.22417C21.9891 7.22417 21.4298 7.08664 20.9286 6.8116C20.4335 6.53044 20.0423 6.14232 19.7551 5.64723C19.4739 5.15214 19.3333 4.58983 19.3333 3.96027C19.3333 3.33072 19.4739 2.7684 19.7551 2.27332C20.0423 1.77212 20.4335 1.384 20.9286 1.10895C21.4298 0.827788 21.986 0.687209 22.5972 0.687209C23.3185 0.687209 23.945 0.864461 24.4767 1.21897C25.0085 1.56736 25.3752 2.05939 25.5769 2.69505H24.1008ZM30.2947 7.16916L27.966 4.31783V7.16916H26.6824V0.769723H27.966V3.63938L30.2947 0.769723H31.8441L29.2037 3.94194L31.9175 7.16916H30.2947ZM35.7322 7.23334C35.1333 7.23334 34.5832 7.09276 34.082 6.8116C33.5808 6.53044 33.1835 6.14232 32.8901 5.64723C32.5967 5.14603 32.45 4.58066 32.45 3.9511C32.45 3.32766 32.5967 2.7684 32.8901 2.27332C33.1835 1.77212 33.5808 1.38094 34.082 1.09978C34.5832 0.81862 35.1333 0.678041 35.7322 0.678041C36.3374 0.678041 36.8874 0.81862 37.3825 1.09978C37.8837 1.38094 38.278 1.77212 38.5652 2.27332C38.8586 2.7684 39.0053 3.32766 39.0053 3.9511C39.0053 4.58066 38.8586 5.14603 38.5652 5.64723C38.278 6.14232 37.8837 6.53044 37.3825 6.8116C36.8813 7.09276 36.3312 7.23334 35.7322 7.23334ZM35.7322 6.08731C36.1173 6.08731 36.4565 6.00174 36.7499 5.83059C37.0433 5.65334 37.2725 5.40274 37.4375 5.0788C37.6026 4.75485 37.6851 4.37896 37.6851 3.9511C37.6851 3.52325 37.6026 3.15041 37.4375 2.83258C37.2725 2.50863 37.0433 2.26109 36.7499 2.08995C36.4565 1.91881 36.1173 1.83324 35.7322 1.83324C35.3472 1.83324 35.0049 1.91881 34.7054 2.08995C34.412 2.26109 34.1828 2.50863 34.0178 2.83258C33.8528 3.15041 33.7702 3.52325 33.7702 3.9511C33.7702 4.37896 33.8528 4.75485 34.0178 5.0788C34.1828 5.40274 34.412 5.65334 34.7054 5.83059C35.0049 6.00174 35.3472 6.08731 35.7322 6.08731ZM43.5725 7.16916L41.2438 4.31783V7.16916H39.9602V0.769723H41.2438V3.63938L43.5725 0.769723H45.122L42.4815 3.94194L45.1953 7.16916H43.5725ZM47.4423 5.82143L46.3696 8.3977H45.5445L46.1404 5.82143H47.4423ZM54.907 0.769723V1.80573H53.2017V7.16916H51.9181V1.80573H50.2128V0.769723H54.907ZM61.1519 0.769723V7.16916H59.8684V4.44619H57.1271V7.16916H55.8435V0.769723H57.1271V3.40101H59.8684V0.769723H61.1519ZM66.3393 5.94978H63.7905L63.3688 7.16916H62.021L64.3223 0.760554H65.8167L68.1179 7.16916H66.761L66.3393 5.94978ZM65.9909 4.92294L65.0649 2.24581L64.1389 4.92294H65.9909ZM70.2617 0.769723V7.16916H68.9781V0.769723H70.2617ZM72.8134 6.15148H74.9221V7.16916H71.5298V0.769723H72.8134V6.15148ZM79.6619 5.94978H77.1131L76.6914 7.16916H75.3437L77.6449 0.760554H79.1393L81.4405 7.16916H80.0836L79.6619 5.94978ZM79.3135 4.92294L78.3875 2.24581L77.4615 4.92294H79.3135ZM87.7742 7.16916H86.4906L83.5843 2.77757V7.16916H82.3007V0.760554H83.5843L86.4906 5.16131V0.760554H87.7742V7.16916ZM91.2796 0.769723C91.952 0.769723 92.5418 0.901134 93.0491 1.16396C93.5625 1.42678 93.9568 1.80268 94.2318 2.29165C94.513 2.77451 94.6536 3.33683 94.6536 3.97861C94.6536 4.62039 94.513 5.18271 94.2318 5.66557C93.9568 6.14232 93.5625 6.5121 93.0491 6.77492C92.5418 7.03775 91.952 7.16916 91.2796 7.16916H89.0426V0.769723H91.2796ZM91.2338 6.07814C91.9061 6.07814 92.4257 5.89477 92.7924 5.52804C93.1591 5.16131 93.3425 4.64484 93.3425 3.97861C93.3425 3.31238 93.1591 2.79285 92.7924 2.42001C92.4257 2.04105 91.9061 1.85158 91.2338 1.85158H90.3261V6.07814H91.2338Z"
      fill="#5B5F84"
    />
  </svg>
)

declare const VALID_LAYOUT_VALUES: readonly ['fill', 'fixed', 'intrinsic', 'responsive', 'raw', undefined]
declare type LayoutValue = (typeof VALID_LAYOUT_VALUES)[number]

export const getFloorImage = (floor: string, className = '') => {
  if (floor === 'Floor 1') return <Image src={Floor1} className={className} alt={floor} id="venue-image" priority />
  if (floor === 'Floor 2') return <Image src={Floor2} className={className} alt={floor} id="venue-image" priority />
  if (floor === 'Floor 3') return <Image src={Floor3} className={className} alt={floor} id="venue-image" priority />
  if (floor === 'Floor 4') return <Image src={Floor4} className={className} alt={floor} id="venue-image" priority />
  if (floor === 'Floor 5') return <Image src={Floor5} className={className} alt={floor} id="venue-image" priority />
  if (floor === 'S1') return <Image src={FloorBasement} className={className} alt={floor} id="venue-image" priority />
}

export const getRoomImage = (room: string, className = '') => {
  if (room === 'stage-1') return <Image src={Stage12} className={className} alt={room} id="venue-image" priority />
  if (room === 'stage-2') return <Image src={Stage12} className={className} alt={room} id="venue-image" priority />
  if (room === 'stage-3') return <Image src={Stage34} className={className} alt={room} id="venue-image" priority />
  if (room === 'stage-4') return <Image src={Stage34} className={className} alt={room} id="venue-image" priority />
  if (room === 'stage-5') return <Image src={Stage56} className={className} alt={room} id="venue-image" priority />
  if (room === 'stage-6') return <Image src={Stage56} className={className} alt={room} id="venue-image" priority />
  if (room === 'main-stage') return <Image src={Stage56} className={className} alt={room} id="venue-image" priority />
}

type ScreenProps = {
  room: RoomType
  sessions: Session[]
}

const SessionBar = ({ session }: { session: Session }) => {
  return (
    <div
      className={cn(
        'rounded-full flex items-center mt-[1vw] gap-[0.5em] p-[0.4em] pr-[1em] border border-solid border-[#dfd8fc] self-start',
        getTrackColor(session.track)
      )}
    >
      <p
        className={cn(
          'rounded-full px-[0.75em] py-[0.25em] uppercase font-bold text-0-75 bg-[#dfd8fc]'
          // getExpertiseColor(session.expertise || '')
        )}
      >
        {session.type}
      </p>
      <p
        className={cn(
          'rounded-full px-[0.75em] py-[0.25em] uppercase font-bold text-0-75',
          getExpertiseColor(session.expertise || '')
        )}
      >
        {session.expertise}
      </p>
      <div className="flex items-center gap-[0.5em] text-center ml-[0.5em]">
        <Image
          src={getTrackLogo(session.track)}
          alt={session.track}
          width={20}
          height={20}
          className="w-[1.5em] h-[1.5em] object-contain"
        />
        <p className="text-0-75 uppercase font-semibold">
          {session.track.startsWith('[CLS]') ? 'Community-Led Session' : session.track}
        </p>
      </div>
    </div>
  )
}

export const RoomScreen = (props: ScreenProps) => {
  const { now } = useAppContext()
  const [notifications, setNotifications] = useRecoilState(notificationsAtom)
  // const sessions = useRecoilValue(sessionsAtom)

  // const pz = usePanzoom()

  // React.useEffect(() => {}, [notifications])

  const getDayLabel = (date: any) => {
    if (!now) return ''
    const nov12 = moment.utc('2024-11-12').add(7, 'hours')
    const dayDiff = date.diff(nov12, 'days')
    if (dayDiff >= 0 && dayDiff <= 3) {
      return `Day 0${dayDiff + 1}`
    }
    return ''
  }

  const upcomingSessions = (() => {
    const upcoming = props.sessions
      .filter(session => {
        const start = moment.utc(session.slot_start).add(7, 'hours')

        const sessionUpcoming = now?.isBefore(start)

        return sessionUpcoming
      })
      .sort((a, b) => {
        return moment.utc(a.slot_start).isBefore(moment.utc(b.slot_start)) ? -1 : 1
      })

    return upcoming.slice(0, 3)
    // Get upcoming sessions
  })()

  let currentSession = (() => {
    return props.sessions.find(session => {
      const start = moment.utc(session.slot_start).add(7, 'hours')
      const end = moment.utc(session.slot_end).add(7, 'hours')
      const sessionHasPassed = now?.isAfter(end)
      const sessionIsUpcoming = now?.isBefore(start)
      const sessionIsLive = !sessionHasPassed && !sessionIsUpcoming

      return sessionIsLive
    })

    // return props.sessions.find(session => session.id.toLowerCase() === 'knphbz') || props.sessions[0]
  })()

  if (!currentSession && upcomingSessions.length > 0) currentSession = upcomingSessions[0]

  let sessionIsLive = false
  let relativeTime = ''

  if (currentSession) {
    const sessionHasPassed = now?.isAfter(moment.utc(currentSession.slot_end).add(7, 'hours'))
    const sessionIsUpcoming = now?.isBefore(moment.utc(currentSession.slot_start).add(7, 'hours'))
    sessionIsLive = !sessionHasPassed && !sessionIsUpcoming
    relativeTime = moment.utc(currentSession.slot_start).add(7, 'hours').from(now)
  }

  if (!currentSession) {
    return (
      <div className={cn(css['room-screen'], css['thanks-for-coming'], 'fixed h-screen relative w-screen')}>
        <Image src={CLS} alt="CLS" className="object-cover h-full w-full" />
        <div className="absolute bottom-[0em] flex-col text-3 font-semibold text-white left-0 right-0 p-[1em] flex items-center justify-center">
          <div className="fixed inset-0 w-full h-full flex justify-center items-center">
            <Image src={DevconLogo} alt="w/e" quality="100" className="object-contain w-1/2" />
          </div>
          <div className="text-2 mb-[0.3em]">Thank you for attending Devcon SEA 2024!</div>
          <p className="whitespace-nowrap shrink-0 text-1-25 text-center !leading-[1.2em]">
            Join us at the closing ceremonies at the Main Stage at 4:00 PM <br />
            <span className="">for a final goodbye</span>
          </p>
        </div>

        {/* <div className={cn(css['updates-row'], 'flex items-center h-[3em] !bg-[#F8F4FF]')}> */}
        {/* <p
            className={cn(
              'rounded-full px-[0.75em] py-[0.25em] uppercase font-bold text-0-75 bg-[#dfd8fc] shrink-0'
              // getExpertiseColor(session.expertise || '')
            )}
          >
            Notifications
          </p> */}

        {/* <InfiniteScroll speed="100s">
            {notifications.slice(0, 1).map((notification: any) => (
              <p key={notification.title} className="whitespace-nowrap shrink-0 mr-[2em]">
                Join us at the closing ceremonies at the main stage at 4pm!
              </p>
            ))}
          </InfiniteScroll> */}
        {/* </div> */}
      </div>
    )
  }

  return (
    <div className={css['room-screen']}>
      <div className={css['left']}>
        <div className="grow">
          <div className="flex justify-between items-center gap-[1.5em] mx-[1em] border-bottom !border-[#b2b2b2] p-[1em]">
            <Image src={DevconLogo} alt="w/e" quality="100" className="w-1/2" />
            <div className="flex flex-col gap-0 items-end w-1/2 grow-0">
              <LogoSimple />
              <p className="text-1 !leading-[0.9em] text-[#6B54AB]">{getDayLabel(now)}</p>
            </div>
          </div>

          <div className="flex justify-between m-[0.3em] p-[1em]">
            <p className="text-1-5 text-[black] ml-[0.2em]">{now?.format('dddd, MMM D')}</p>
            <p className="text-1-25 font-bold text-[black] flex gap-[0.75em] items-center mr-[0.5em]">
              <IconClock style={{ '--color-icon': '#7D52F4' } as React.CSSProperties} />
              {now?.format('LT')}
            </p>
          </div>
          {/* <div className={css['logo-wrapper']}>
            <Image src={DevconLogo} alt="w/e" quality="100" />
          </div> */}
          {/* <div className={css['image-wrapper']}>{getFloorImage(props.room.info)}</div> */}
          {/* <div data-type="image-left grow relative z-[-1]"> */}
          <div id="image-container" className="inset-0 grow relative">
            <div className="absolute left-0 top-0 right-0 bottom-0">
              <div className={css['title']}>
                {/* <p className="text-1">{props.room.info}</p> */}
                <p className="text-2 bold relative">
                  {props.room.name} - {props.room.description}
                </p>
              </div>
            </div>
            {getRoomImage(props.room.id, 'contain w-full h-full object-cover')}
          </div>
          {/* </div> */}
          {props.room.capacity && (
            <div className={cn(css['capacity'], 'flex grow-0')}>
              <p className="text-1-25">
                Room Capacity: <span className="font-semibold">{props.room.capacity}</span>
              </p>
              <IconPeople style={{ '--color-icon': '#765BE6', fontSize: '2.2em' } as React.CSSProperties} />
            </div>
          )}
        </div>

        <div className={cn(css['time'], 'gradient text-white')}>
          {/* <div className={css['now']}>
            <p>{moment.utc(now).format('dddd, MMM Do')}</p>

            <div className={css['am-pm']}>
              <IconClock />
              <p>{moment.utc(now).format('LT')}</p>
            </div>
          </div> */}

          {upcomingSessions.length > 0 && (
            <>
              {/* <div className={css['border']}></div> */}

              <div className={cn(css['next-session'], 'flex items-center justify-between')}>
                <p className="bold text-1-25">Next Session</p>
                <p className="text-2">{moment.utc(upcomingSessions[0].slot_start).add(7, 'hours').from(now, true)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={cn(css['right'], 'flex flex-col')}>
        {currentSession && (
          <>
            <div className={css['first-row']}>
              {/* <p className="text-1">Session</p>
              <p className="text-1 bold">{currentSession.type}</p>
              <p className="text-1 bold">{currentSession.track}</p>
              {(() => {
                const startTime = moment.utc(currentSession.slot_start)
                // const duration = currentSession.duration
                const endTime = moment.utc(currentSession.slot_end)

                return `${startTime.format('MMM Do')} — ${startTime.format('h:mm A')} - ${endTime.format('h:mm A')}`
              })()}
              {sessionIsLive && <p className="text-1 live bold">Happening Now</p>} */}
            </div>

            <div className={cn(css['second-row'], 'flex-grow flex justify-between relative')}>
              <div className="flex flex-col gap-4 w-[60%]">
                {/* <div className="absolute bottom-0 right-[-2vw] left-[-2vw] h-[6.5em] z-[-1] glass"></div> */}

                <div className="flex items-center gap-[0.5em]">
                  <SessionBar session={currentSession} />
                  {sessionIsLive && <p className="text-1-25 mt-[1vw] ml-[1vw] live bold">Happening Now</p>}
                  {relativeTime && !sessionIsLive && (
                    <p className="text-1-25 mt-[1vw] ml-[1vw] !border-gray-400 bold">Starts {relativeTime}</p>
                  )}
                </div>

                <p className="text-2-5 clamp-3 !leading-[1.3em]">{currentSession.title}</p>

                <div className={cn(css['speakers'], 'grow flex-col justify-end flex-nowrap nowrap')}>
                  {/* <p className={css['title']}>Speakers</p> */}
                  <div className="flex items-center">
                    {currentSession.speakers.map(speaker => {
                      return (
                        <div
                          className={cn(
                            css['speaker'],
                            'glass p-[0.2em] py-[0.8em] shrink-0',
                            // @ts-ignore
                            speaker === currentSession.speakers[currentSession.speakers.length - 1] && 'rounded-tr-2xl'
                          )}
                          key={`${speaker.id}`}
                        >
                          <div className={css['thumbnail']}>
                            <div className={css['wrapper']}>
                              <Image
                                src={speaker.avatar || makeBlockie(speaker.name || speaker.id)}
                                alt={speaker.name}
                                objectFit="cover"
                                layout="fill"
                              />
                            </div>
                          </div>
                          <p className="bold">{speaker.name}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* <div className="fixed botto-0 right-0 transform -translate-y-1/4 translate-x-1/4 z-[-1]"> */}
              <Image
                src={getTrackLogo(currentSession.track)}
                alt={currentSession.track}
                quality="100"
                className="object-cover absolute w-[60%] h-full right-[-20%] right-0 bottom-0 z-[-2]"
              />
              {/* </div> */}
            </div>

            {/* <div className={css['speakers']}>
              <p className={css['title']}>Speakers</p>

              {currentSession.speakers.map(speaker => {
                return (
                  <div className={css['speaker']} key={speaker.id}>
                    <div className={css['thumbnail']}>
                      <div className={css['wrapper']}>
                        <Image
                          src={speaker.avatar || makeBlockie(speaker.name || speaker.id)}
                          alt={speaker.name}
                          objectFit="cover"
                          layout="fill"
                        />
                      </div>
                    </div>
                    <p className="bold">{speaker.name}</p>
                  </div>
                )
              })}
            </div> */}

            <div className={css['description']}>
              <p className={css['title']}>Description</p>

              <p>{currentSession.description}</p>
            </div>
          </>
        )}

        <div className={cn(css['livestreams-upcoming'], 'grow')}>
          {currentSession && (
            <div className="flex flex-col gap-[1em]">
              <div className={cn(css['livestreams'], 'mr-2')}>
                <div className={css['body']}>
                  <p className={css['title']}>Resources / Livestreams</p>
                  <p className="!mt-0">View the session on the Devcon App to access more information. </p>

                  <p>If room capacity is full, please watch the session on live stream.</p>

                  <div className="rounded-xl border border-solid font-semibold border-[#dfd8fc] p-[0.5em] px-[1em] self-start shrink-0 text-0-75">
                    https://app.devcon.org/schedule/{currentSession.sourceId}
                  </div>

                  <p>
                    Network Name: <b>Ethereum</b>
                    <br />
                    Wifi Password: <b>theinfinitegarden</b>
                  </p>
                </div>

                {/* <div className={cn(css['qr-code'], 'rounded-xl')}> */}
                <div className="flex flex-col items-center justify-center mt-[5em] mx-[1em]">
                  <div className="flex shrink-0 justify-center aspect-square items-center p-[1em] border border-solid border-[#dfd8fc] rounded-2xl">
                    <QRCode
                      size={256}
                      // className="aspect-square"
                      style={{ height: 'auto', maxWidth: '10em', width: '100%' }}
                      value={`app.devcon.org/schedule/${currentSession.sourceId}`}
                      viewBox={`0 0 256 256`}
                    />
                  </div>
                  <p className="text-sm bg-[#7D52F4] py-[0.5em] px-[1em] rounded-2xl text-center text-[white] font-semibold !leading-[1.2em] mt-[0.7em] shrink-0">
                    Watch Livestream
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className={cn(css['upcoming'], 'relative ml-[1em]')}>
            <p className={css['title']}>Upcoming Sessions</p>

            {/* {upcomingSessions.length === 0 && <p>There are no upcoming sessions</p>} */}

            {upcomingSessions.map(session => (
              <SessionCardPercentual key={session.id} session={session} className="mb-[0.5em]" />
            ))}

            {upcomingSessions.length === 0 && (
              <div className="flex flex-col justify-center items-center h-full !mt-0">
                <Image src={NoResults} alt="No results" className="w-[50%]" />
                {/* <div className="mt-[0.5em] text-sm text-[#535353] font-semibold">There are no upcoming sessions</div> */}
              </div>
            )}
          </div>
        </div>
        <div className={cn(css['updates-row'], 'flex items-center h-[3em] !bg-[#F8F4FF]')}>
          <p
            className={cn(
              'rounded-full px-[0.75em] py-[0.25em] uppercase font-bold text-0-75 bg-[#dfd8fc] shrink-0'
              // getExpertiseColor(session.expertise || '')
            )}
          >
            Notifications
          </p>

          <InfiniteScroll speed="100s">
            {notifications.slice(0, 1).map((notification: any) => (
              <p key={notification.title} className="whitespace-nowrap shrink-0 mr-[2em]">
                {notification.message}
              </p>
            ))}

            {/* <p>Wifi password: &apos;runafullnode&apos;</p> */}

            <div className="whitespace-nowrap mr-[2em]">
              If the room is full please view on livestream or ask volunteers for any overflow rooms.
            </div>
          </InfiniteScroll>
        </div>
      </div>
    </div>
  )
}
