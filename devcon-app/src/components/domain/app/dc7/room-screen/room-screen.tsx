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
import DevconLogo from 'assets/images/dc-7/logo-flowers.png'
import {
  SessionCardPercentual,
  getExpertiseColor,
  getTrackColor,
  getTrackLogo,
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
import { notificationsAtom } from 'pages/_app'
import { useRecoilState } from 'recoil'
import { Button } from 'lib/components/button'
// const trackID = getTrackID(props.track)

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
  if (room === 'main-stage') return <Image src={Stage56} className={className} alt={room} id="venue-image" priority />
}

type ScreenProps = {
  room: RoomType
  sessions: Session[]
}

const SessionBar = ({ session }: { session: Session }) => {
  console.log(session)
  return (
    <div
      className={cn(
        'rounded-full flex items-center mt-[1vw] gap-[0.5em] p-[0.5em] pr-[1em] border border-solid border-[#dfd8fc] self-start',
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
        <p className="text-1 font-semibold">{session.track}</p>
      </div>
    </div>
  )
}

export const RoomScreen = (props: ScreenProps) => {
  const { now } = useAppContext()
  const [notifications, setNotifications] = useRecoilState(notificationsAtom)
  // const pz = usePanzoom()

  const getDayLabel = (date: any) => {
    if (!now) return ''
    const nov12 = moment.utc('2024-11-12')
    const dayDiff = date.diff(nov12, 'days')
    if (dayDiff >= 0 && dayDiff <= 3) {
      return `Day ${dayDiff + 1}`
    }
    return ''
  }

  const upcomingSessions = (() => {
    const upcoming = props.sessions
      .filter(session => {
        const start = moment.utc(session.slot_start)

        const sessionUpcoming = now?.isBefore(start)

        return sessionUpcoming
      })
      .sort((a, b) => {
        return moment.utc(a.slot_start).isBefore(moment.utc(b.slot_start)) ? -1 : 1
      })

    return upcoming.slice(0, 2)
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

  if (currentSession) {
    const sessionHasPassed = now?.isAfter(moment.utc(currentSession.slot_end).add(7, 'hours'))
    const sessionIsUpcoming = now?.isBefore(moment.utc(currentSession.slot_start).add(7, 'hours'))
    sessionIsLive = !sessionHasPassed && !sessionIsUpcoming
  }

  return (
    <div className={css['room-screen']}>
      <div className={css['left']}>
        <div className="grow">
          <div className="flex justify-between items-center gap-[1.5em] border-bottom">
            <Image src={DevconLogo} alt="w/e" quality="100" className="w-1/2 p-[1.5em]" />
            <p className="text-1">
              {now?.format('dddd, MMM Do')}, {getDayLabel(now)}
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
              <IconPeople style={{ '--color-icon': 'blue', fontSize: '2.2em' } as React.CSSProperties} />
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
                <p className="text-2">{moment.utc(upcomingSessions[0].slot_start).from(now, true)}</p>
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
                <div className="absolute bottom-0 right-[-2vw] left-[-2vw] h-[6.5em] bg-black z-[-1] glass"></div>
                <SessionBar session={currentSession} />

                <p className="text-2-5 clamp-3 !leading-[1.3em]">{currentSession.title}</p>

                <div className={cn(css['speakers'], 'grow flex-col justify-end flex-nowrap nowrap')}>
                  {/* <p className={css['title']}>Speakers</p> */}
                  <div className="glass flex items-center gap-[0.5em]">
                    {currentSession.speakers.map(speaker => {
                      return (
                        <div className={cn(css['speaker'], 'shrink-0')} key={speaker.id}>
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
              <div className={cn(css['livestreams'], '')}>
                <div className={css['body']}>
                  <p className={css['title']}>Resources / Livestreams</p>
                  <p>Please visit the session on the Devcon App to access more information. </p>

                  <p>If room capacity is full, please watch the session on live stream.</p>

                  <div className="rounded-xl border border-solid font-semibold border-[#dfd8fc] p-[0.5em] px-[1em] self-start shrink-0 text-0-75">
                    https://app.devcon.org/schedule/{currentSession.sourceId}
                  </div>

                  <p>
                    Network Name: <b>DevconSEA</b>
                    <br />
                    Wifi Password: <b>infinitegarden</b>
                  </p>
                </div>

                <div className={cn(css['qr-code'], 'rounded-xl max-w-[10em] max-h-[10em]')}>
                  <QRCode
                    size={256}
                    style={{ height: 'auto', maxWidth: '10em', width: '100%' }}
                    value={`app.devcon.org/schedule/${currentSession.sourceId}`}
                    viewBox={`0 0 256 256`}
                  />
                </div>
              </div>
            </div>
          )}
          <div className={cn(css['upcoming'], 'min-h-[12em]')}>
            <p className={css['title']}>Upcoming Sessions</p>

            {upcomingSessions.length === 0 && <p>There are no upcoming sessions</p>}

            {upcomingSessions.map(session => (
              <SessionCardPercentual key={session.id} session={session} className="mb-[0.5em]" />
            ))}
          </div>
        </div>
        <div className={cn(css['updates-row'], 'flex items-center gap-[0.5em] h-[3em] !bg-[#F8F4FF]')}>
          <p
            className={cn(
              'rounded-full px-[0.75em] py-[0.25em] uppercase font-bold text-0-75 bg-[#dfd8fc] shrink-0'
              // getExpertiseColor(session.expertise || '')
            )}
          >
            Notifications
          </p>

          {notifications.slice(0, 1).map((notification: any) => (
            <p key={notification.title} className="whitespace-nowrap shrink-0">
              {notification.message}
            </p>
          ))}

          {/* <p>Wifi password: &apos;runafullnode&apos;</p> */}

          <div className="whitespace-nowrap">
            If the room is full please view on livestream or ask volunteers for any overflow rooms.
          </div>
        </div>
      </div>
    </div>
  )
}
