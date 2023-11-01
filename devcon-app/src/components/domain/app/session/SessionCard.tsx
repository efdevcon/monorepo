import React from 'react'
import css from './session-card.module.scss'
import IconClock from 'assets/icons/icon_clock.svg'
import IconCalendar from 'assets/icons/schedule-plus.svg'
import IconAdded from 'assets/icons/calendar-added.svg'
import IconAdd from 'assets/icons/calendar-add.svg'
import IconMarker from 'assets/icons/icon_marker.svg'
import IconPeople from 'assets/icons/icon_people.svg'
import IconSpeaker from 'assets/icons/icon_speaker.svg'
import IconCheck from 'assets/icons/check_circle.svg'
import { ThumbnailBlock } from 'components/common/thumbnail-block'
import { Session } from 'types/Session'
import { useAccountContext } from 'context/account-context'
import moment from 'moment'
import { Link } from 'components/common/link'
import { useAppContext } from 'context/app-context'
import { RoomInfo } from '../venue/RoomInfo'
import { useIsStandalone } from 'utils/pwa-link'
import { Speaker } from 'types/Speaker'

type CardProps = {
  session: Session
  className?: string
  compact?: boolean
  scalePercentages?: boolean
}

export const SessionCard = (props: CardProps) => {
  const { account, setSessionBookmark } = useAccountContext()
  const { now } = useAppContext()
  const bookmarkedSessions = account?.appState?.sessions
  const bookmarkedSession = bookmarkedSessions?.find(
    bookmark => bookmark.id === props.session.id && bookmark.level === 'attending'
  )
  const sessionIsBookmarked = !!bookmarkedSession
  const start = moment.utc(props.session.start)
  const end = moment.utc(props.session.end)
  const sessionHasPassed = now?.isAfter(end)
  const sessionIsUpcoming = now?.isBefore(start)
  const sessionIsLive = !sessionHasPassed && !sessionIsUpcoming
  const nowPlusSoonThreshold = now && now.clone().add(1, 'hours')
  const isSoon = moment.utc(start).isAfter(now) && moment.utc(start).isBefore(nowPlusSoonThreshold)
  const relativeTime = start.from(now)

  const iconProps = {
    className: `${css['save-session']} icon`,
    onClick: (e: React.SyntheticEvent) => {
      e.stopPropagation()

      setSessionBookmark(props.session, 'attending', account, !!sessionIsBookmarked)
    },
  }

  if (sessionIsBookmarked) {
    iconProps.className += ` ${css['saved']}`
  }

  let thumbnailClassName = css['thumbnail-container']
  let detailsClassName = css['details']

  if (props.compact) thumbnailClassName += ` ${css['compact']}`
  if (props.className) thumbnailClassName += ` ${props.className}`

  // if (sessionHasPassed) {
  //   thumbnailClassName += ` ${css['passed']}`
  // }

  if (sessionIsLive) {
    thumbnailClassName += ` ${css['ongoing']}`
  }

  if (props.scalePercentages) {
    detailsClassName += ` ${css['scale-percentages']}`
  }

  const isStandalone = useIsStandalone()

  const sessionUrl = isStandalone ? `/schedule?session=${props.session.id}` : `/schedule/${props.session.id}`

  return (
    <ThumbnailBlock
      className={thumbnailClassName}
      thumbnailSubtext={props.session.track}
      track={props.session.track}
      thumbnailUrl={sessionUrl}
      scalePercentages={props.scalePercentages}
    >
      <div className={detailsClassName}>
        <div className={css['top']}>
          <Link to={sessionUrl} className={css['title']}>
            {props.session.title}
          </Link>

          {sessionIsLive && <div className="label red bold sm">Happening now!</div>}
          {isSoon && <div className="label bold sm">Starts {relativeTime}</div>}

          {!props.scalePercentages && (
            <>
              {sessionIsBookmarked ? (
                <IconAdded {...iconProps} />
              ) : (
                <IconAdd {...iconProps} style={{ opacity: '0.5' }} />
              )}
            </>
          )}
        </div>

        <div className={css['bottom']}>
          {props.session.room && (
            <div className={css['room']}>
              <RoomInfo room={props.session.room} align />

              {props.session.room.capacity && (
                <div className={css['n-seats']}>
                  <IconPeople />
                  <p>{props.session.room.capacity}</p>
                </div>
              )}
            </div>
          )}

          {props.session.speakers.length > 0 && (
            <div className={css['speakers']}>
              <IconSpeaker />
              {props.session.speakers
                .sort((a: Speaker, b: Speaker) => {
                  return a.name.localeCompare(b.name)
                })
                .map((speaker, index) => {
                  const isLast = props.session.speakers.length - 1 === index
                  const isFirst = index === 0

                  return (
                    <Link
                      key={speaker.id}
                      className={`${css['speaker']} ${isFirst ? css['is-first'] : ''}`}
                      to={isStandalone ? `/speakers?speaker=${speaker.id}` : `/speakers/${speaker.id}`}
                    >
                      {speaker.name}
                      {!isLast && <>,&nbsp;</>}
                    </Link>
                  )
                })}
            </div>
          )}

          <div className={css['time']}>
            <IconClock />
            <p>
              {(() => {
                const startTime = moment.utc(props.session.start)
                const endTime = moment.utc(props.session.end)

                return `${startTime.format('MMM Do')} — ${startTime.format('HH:mm A')} - ${endTime.format('HH:mm A')}`
              })()}
            </p>
          </div>
        </div>
      </div>
    </ThumbnailBlock>
  )
}
