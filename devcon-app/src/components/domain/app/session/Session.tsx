import React, { useEffect } from 'react'
import IconClock from 'assets/icons/icon_clock.svg'
import IconStar from 'assets/icons/star.svg'
import IconStarFill from 'assets/icons/star-fill.svg'
import IconCalendarAdd from 'assets/icons/schedule-plus.svg'
import IconMarker from 'assets/icons/icon_marker.svg'
import IconPeople from 'assets/icons/icon_people.svg'
import IconAdded from 'assets/icons/calendar-added.svg'
import IconAdd from 'assets/icons/calendar-add.svg'
import { SpeakerCard } from 'components/domain/app/speakers'
import { SessionCard } from './SessionCard'
import css from './session.module.scss'
import IconCheck from 'assets/icons/check_circle.svg'
import { Session as SessionType } from 'types/Session'
import moment from 'moment'
import { GetDevconDay } from 'utils/formatting'
import { useAccountContext } from 'context/account-context'
import { AppNav } from 'components/domain/app/navigation'
import IconCalendar from 'assets/icons/calendar.svg'
import { getTrackImage, getTrackID } from 'components/domain/index/track-list/TrackList'
import { CopyToClipboardLegacy } from 'components/common/share/Share'
import PinIcon from 'assets/icons/pin.svg'
import { Link } from 'components/common/link'
import AddToCalendar from 'components/domain/index/add-to-calendar/AddToCalendar'
import { useAppContext } from 'context/app-context'
import { LivestreamCard } from './LivestreamCard'
import { APP_URL } from 'utils/constants'
import { useIsStandalone } from 'utils/pwa-link'
import { Speaker } from 'types/Speaker'
import { ArchiveCard } from './ArchiveCard'

const Hero = (props: any) => {
  let className = css['hero']
  const trackID = getTrackID(props.track)

  if (props.className) className += ` ${props.className}`
  if (trackID) className += ` ${css[trackID]}`

  return (
    <div className={className}>
      <div className={`section`} style={{ position: 'relative' }}>
        <div className={css['background-icon']}>{getTrackImage(trackID)}</div>
      </div>
      {props.children}
    </div>
  )
}

type SessionProps = {
  session: SessionType
  relatedSessions?: SessionType[]
}

export const Session = (props: SessionProps) => {
  const { now } = useAppContext()
  const { account, setSessionBookmark } = useAccountContext()
  const start = moment.utc(props.session.start)
  const end = moment.utc(props.session.end)
  const duration = moment.duration(moment(props.session.end).diff(start))
  const mins = duration.asMinutes()
  const [relativeTime, setRelativeTime] = React.useState<any>(null)
  const isStandalone = useIsStandalone()

  const interested = account?.appState?.sessions?.some(i => i.level === 'interested' && i.id === props.session.id)
  const attending = account?.appState?.sessions?.some(i => i.level === 'attending' && i.id === props.session.id)

  const sessionUpcoming = now?.isBefore(start)
  const sessionEnded = now?.isAfter(end)
  const isOngoing = !sessionUpcoming && !sessionEnded
  // const relativeTime = sessionUpcoming ? start.from(now) : end.from(now)

  // Have to defer to useEffect because of potential time related client/server mismatch causing hydration errors
  useEffect(() => {
    const relativeTime = sessionUpcoming ? start.from(now, true) : end.from(now, true)

    setRelativeTime(relativeTime)
  }, [start, end, now, sessionUpcoming])

  async function bookmarkSession(level: 'interested' | 'attending') {
    if (level === 'interested') {
      setSessionBookmark(props.session, level, account, !!interested)
    }
    if (level === 'attending') {
      setSessionBookmark(props.session, level, account, !!attending)
    }
  }

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: props.session.title || 'Session',
          },
        ]}
        renderRight={() => (
          <>
            <CopyToClipboardLegacy url={`${APP_URL}schedule/${props.session.id}`} />

            <>
              {attending ? (
                <IconAdded
                  style={{ cursor: 'pointer' }}
                  className="icon fill-red"
                  onClick={() => bookmarkSession('attending')}
                />
              ) : (
                <IconAdd style={{ cursor: 'pointer' }} onClick={() => bookmarkSession('attending')} />
              )}
            </>
          </>
        )}
      />

      <Hero track={props.session.track} className={css['session-hero']}>
        <div className="section">
          <div className={css['container']}>
            {props.session.room && (
              <div className={css['info-line']}>
                <IconMarker />
                <p>
                  {props.session.room.name} {props.session.room.description && ` — ${props.session.room.description}`},{' '}
                  {props.session.room.info}
                </p>
              </div>
            )}
            {props.session.room?.capacity && (
              <div className={css['info-line']}>
                <IconPeople />
                <p>{props.session.room.capacity}</p>
              </div>
            )}

            <h2 className={css['title']}>
              <span>{props.session.title}</span>
            </h2>

            {(props.session.expertise || props.session.type) && (
              <div className={`${css['expertise-and-type']} ${css['meta']}`}>
                {props.session.type && <p className="bold">{props.session.type}</p>}
                {props.session.expertise && <p className="bold">{props.session.expertise}</p>}
              </div>
            )}

            <div className={css['meta']}>
              <div className="label white bold">{props.session.track || 'No specific track'}</div>
            </div>

            <div className={css['info-line']} style={{ marginTop: '12px' }}>
              <IconClock />
              <p>
                {GetDevconDay(props.session.start)} —
                <span style={{ marginLeft: '6px', fontWeight: 400 }}>
                  {moment.utc(props.session.start).format('ddd, MMM DD')}
                </span>
                <span style={{ marginLeft: '12px' }}>
                  {moment.utc(props.session.start).format('HH:mm')} - {moment.utc(props.session.end).format('HH:mm')}
                </span>
                <span style={{ marginLeft: '12px', fontWeight: 400 }}>{mins} Mins</span>
              </p>
            </div>

            {relativeTime && (
              <p className={css['relative-time']}>
                {(() => {
                  if (isOngoing) return <div className="label red sm">Session is happening now</div>

                  if (sessionUpcoming) {
                    return `Session starts in ${relativeTime}`
                  } else {
                    return `Session ended ${relativeTime} ago`
                  }
                })()}
              </p>
            )}

            {/* <div className={css['calendar-icon-in-circle']}>
              <IconCalendar />
            </div> */}
          </div>
        </div>
      </Hero>

      <div className="section">
        <div className={css['actions']}>
          {/* {account && ( */}
          <>
            <div onClick={() => bookmarkSession('interested')} className={css[interested ? 'active' : '']}>
              <p>Mark as interesting</p> {interested ? <IconStarFill /> : <IconStar />}
            </div>
            <div onClick={() => bookmarkSession('attending')} className={css[attending ? 'active' : '']}>
              <p>Attend Session</p> <> {attending ? <IconAdded /> : <IconAdd />}</>
            </div>
          </>
          {/* )} */}
          <AddToCalendar
            event={{
              id: props.session.id,
              title: `${props.session.title}${props.session.room ? ` / Room: ${props.session.room.name}` : ''}`,
              description: props.session.description,
              location: 'Agora Bogotá Convention Center',
              startDate: moment.utc(props.session.start),
              endDate: moment.utc(props.session.end),
            }}
          >
            <div style={{ cursor: 'pointer' }}>
              <p>Export to Calendar</p> <IconCalendar />
            </div>
          </AddToCalendar>

          <Link to={isStandalone ? `/venue?room=${props.session.room?.id}` : `/venue/${props.session.room?.id}`}>
            <p>Room Details</p> <PinIcon />
          </Link>
        </div>

        {props.session.speakers.length > 0 && (
          <div className={css['speakers']}>
            <h3 className="app-header clear-bottom-less">Speakers</h3>
            {props.session.speakers
              .sort((a: Speaker, b: Speaker) => {
                return a.name.localeCompare(b.name)
              })
              .map(i => {
                return <SpeakerCard key={i.id} speaker={i} />
              })}
          </div>
        )}

        <div className={css['description']}>
          <h3 className="app-header clear-bottom-less">Description</h3>
          <p>{props.session.description}</p>
        </div>

        <ArchiveCard session={props.session} />
        {/* {relativeTime && <LivestreamCard session={props.session} relativeTime={relativeTime} />} */}

        {props.relatedSessions && props.relatedSessions.length > 0 && (
          <div className={css['related-sessions']}>
            <h3 className="app-header clear-bottom-less">Related Sessions</h3>
            {props.relatedSessions.map(session => {
              return <SessionCard session={session} key={session.id} />
            })}
          </div>
        )}
      </div>
    </>
  )
}
