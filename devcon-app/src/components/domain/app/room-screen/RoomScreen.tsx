import React from 'react'
import css from './room-screen.module.scss'
import { Room as RoomType } from 'types/Room'
import { Session } from 'types/Session'
import { useAppContext } from 'context/app-context'
import QRCode from 'react-qr-code'
import { getTrackImage, getTrackID } from 'components/domain/index/track-list/TrackList'
import IconClock from 'assets/icons/clock.svg'
import IconPeople from 'assets/icons/people.svg'
import moment from 'moment'
import { usePanzoom, PanzoomControls } from 'components/domain/app/venue/Venue'
import venueCss from 'components/domain/app/venue/venue.module.scss'
// import { getFloorImage } from 'components/domain/app/venue/Floor'
import Image from 'next/image'
import DevconLogo from './dcvibogota.png'
import { SessionCard } from 'components/domain/app/session/SessionCard'
import makeBlockie from 'ethereum-blockies-base64'
import { Room } from '../venue'
import FloorBasement from 'assets/images/venue-map/FloorBasement.png'
import Floor1 from 'assets/images/venue-map/Floor1.png'
import Floor2 from 'assets/images/venue-map/Floor2.png'
import Floor3 from 'assets/images/venue-map/Floor3.png'
import Floor4 from 'assets/images/venue-map/Floor4.png'
import Floor5 from 'assets/images/venue-map/Floor5.png'
// const trackID = getTrackID(props.track)

declare const VALID_LAYOUT_VALUES: readonly ['fill', 'fixed', 'intrinsic', 'responsive', 'raw', undefined]
declare type LayoutValue = typeof VALID_LAYOUT_VALUES[number]

export const getFloorImage = (floor: string, layout: LayoutValue = 'fill', className = '') => {
  if (floor === 'Floor 1')
    return (
      <Image
        src={Floor1}
        className={className}
        alt={floor}
        layout={layout}
        objectFit="contain"
        id="venue-image"
        priority
      />
    )
  if (floor === 'Floor 2')
    return (
      <Image
        src={Floor2}
        className={className}
        alt={floor}
        layout={layout}
        objectFit="contain"
        id="venue-image"
        priority
      />
    )
  if (floor === 'Floor 3')
    return (
      <Image
        src={Floor3}
        className={className}
        alt={floor}
        layout={layout}
        objectFit="contain"
        id="venue-image"
        priority
      />
    )
  if (floor === 'Floor 4')
    return (
      <Image
        src={Floor4}
        className={className}
        alt={floor}
        layout={layout}
        objectFit="contain"
        id="venue-image"
        priority
      />
    )
  if (floor === 'Floor 5')
    return (
      <Image
        src={Floor5}
        className={className}
        alt={floor}
        layout={layout}
        objectFit="contain"
        id="venue-image"
        priority
      />
    )
  if (floor === 'S1')
    return (
      <Image
        src={FloorBasement}
        className={className}
        alt={floor}
        layout={layout}
        objectFit="contain"
        id="venue-image"
        priority
      />
    )
}

type ScreenProps = {
  room: RoomType
  sessions: Session[]
}

export const RoomScreen = (props: ScreenProps) => {
  const { now } = useAppContext()
  // const pz = usePanzoom()

  const upcomingSessions = (() => {
    const upcoming = props.sessions
      .filter(session => {
        const start = moment.utc(session.start)

        const sessionUpcoming = now?.isBefore(start)

        return sessionUpcoming
      })
      .sort((a, b) => {
        return moment.utc(a.start).isBefore(moment.utc(b.start)) ? -1 : 1
      })

    return upcoming.slice(0, 2)
    // Get upcoming sessions
  })()

  let currentSession = (() => {
    return props.sessions.find(session => {
      const start = moment.utc(session.start)
      const end = moment.utc(session.end)
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
    const sessionHasPassed = now?.isAfter(currentSession.end)
    const sessionIsUpcoming = now?.isBefore(currentSession.start)
    sessionIsLive = !sessionHasPassed && !sessionIsUpcoming
  }

  return (
    <div className={css['room-screen']}>
      <div className={css['left']}>
        <div>
          <div className={css['logo-wrapper']}>
            <Image src={DevconLogo} alt="w/e" quality="100" />
          </div>

          <div className={css['title']}>
            <p className="text-1">{props.room.info}</p>
            <p className="text-2 bold">
              {props.room.name} - {props.room.description}
            </p>
          </div>

          <div className={css['image-wrapper']}>{getFloorImage(props.room.info)}</div>

          {/* <div className={venueCss['panzoom']}>
            <div className={venueCss['image']} id="image-container">
              {getFloorImage(props.room.info)}
            </div>
          </div> */}

          {props.room.capacity && (
            <div className={css['capacity']}>
              <p className="text-1">Room Capacity: {props.room.capacity}</p>
              <IconPeople />
            </div>
          )}
        </div>

        <div className={css['time']}>
          <div className={css['now']}>
            <p>{moment().format('dddd, MMM Do')}</p>

            <div className={css['am-pm']}>
              <IconClock />
              <p>{moment().format('LT')}</p>
            </div>
          </div>

          {upcomingSessions.length > 0 && (
            <>
              <div className={css['border']}></div>

              <div className={css['next-session']}>
                <p className="bold">Next Session</p>
                <p className="text-2">{moment.utc(upcomingSessions[0].start).from(now, true)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={css['right']}>
        {currentSession && (
          <>
            <div className={css['first-row']}>
              <p className="text-1">Session</p>
              <p className="text-1 bold">{currentSession.type}</p>
              <p className="text-1 bold">{currentSession.track}</p>
              {(() => {
                const startTime = moment.utc(currentSession.start)
                const endTime = startTime.clone().add(currentSession.duration, 'minutes')

                return `${startTime.format('MMM Do')} — ${startTime.format('h:mm A')} - ${endTime.format('h:mm A')}`
              })()}
              {sessionIsLive && <p className="text-1 live bold">Happening Now</p>}
            </div>

            <div className={css['second-row']}>
              <p className="text-3 clamp-2">{currentSession.title}</p>
            </div>

            <div className={css['speakers']}>
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
            </div>

            <div className={css['description']}>
              <p className={css['title']}>Description</p>

              <p>{currentSession.description}</p>
            </div>
          </>
        )}

        <div className={css['livestreams-upcoming']}>
          {currentSession && (
            <div className={css['livestreams']}>
              <div className={css['body']}>
                <p className={css['title']}>Resources / Livestreams</p>
                <p>Please visit the session on the Devcon App to access more information. </p>

                <p>If room capacity is full, please watch the session on live stream.</p>
                <p>
                  Network Name: <b>DevconBogota</b>
                  <br />
                  Wifi Password: <b>runafullnode</b>
                </p>

                <div className={css['session-link']}>app.devcon.org/schedule/{currentSession.id}</div>
              </div>

              <div className={css['qr-code']}>
                <QRCode
                  size={256}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  value={`app.devcon.org/schedule/${currentSession.id}`}
                  viewBox={`0 0 256 256`}
                />
              </div>
            </div>
          )}
          <div className={css['upcoming']}>
            <p className={css['title']}>Upcoming Sessions</p>

            {upcomingSessions.length === 0 && <p>There are no upcoming sessions</p>}

            {upcomingSessions.map(session => (
              <SessionCard key={session.id} session={session} scalePercentages />
            ))}
          </div>
        </div>
        <div className={css['updates-row']}>
          <div className="tag red sm">Updates</div>
          <p>Wifi password: &apos;runafullnode&apos;</p>

          <div className="">
            If the room is full please view on livestream or ask volunteers for any overflow rooms.
          </div>
        </div>
      </div>
    </div>
  )
}
