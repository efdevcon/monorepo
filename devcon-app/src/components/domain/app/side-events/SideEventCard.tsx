import React from 'react'
import css from './side-event.module.scss'
import IconClock from 'assets/icons/icon_clock.svg'
import IconMarker from 'assets/icons/icon_marker.svg'
import IconPeople from 'assets/icons/icon_people.svg'
import IconSpeaker from 'assets/icons/icon_speaker.svg'
import { ThumbnailBlock } from 'components/common/thumbnail-block'
import moment from 'moment'
import { Link } from 'components/common/link'

export type SideEvent = {
  id: string
  title: string
  url?: string
  start: string
  end?: string
  location?: string
  image?: string
  capacity?: number
  type?: string
}

type CardProps = {
  event: SideEvent
  compact?: boolean
}

export const SideEventCard = (props: CardProps) => {
  let thumbnailClassName = css['thumbnail-container']

  if (!props.event.url) return null
  if (props.event.type && typeof props.event.type === 'string') {
    const normalized = props.event.type.replace('/', '').replace(' ', '').toLowerCase()

    thumbnailClassName += ` ${css[normalized]}`
  }

  return (
    <ThumbnailBlock className={thumbnailClassName} thumbnailSubtext="" /*thumbnail={props.event.image}*/ unoptimized>
      <div className={css['details']}>
        <div className={css['top']}>
          <Link to={props.event.url} /*`/app/schedule/${props.event.id}`}*/ className={css['title']}>
            {props.event.title}
          </Link>

          {/* {props.event.type && (
            <div className={css['type']}>
              <div className="label sm bold">{props.event.type}</div>
            </div>
          )} */}
        </div>

        <div className={css['bottom']}>
          {/* {props.event.location && (
            <div className={css['location-title']}>
              <IconMarker />
              <p>{props.event.location}</p>
            </div>
          )} */}

          {/* {props.event.capacity && (
            <div className={css['capacity']}>
              <IconPeople />
              <p>{props.event.capacity}</p>
            </div>
          )} */}

          <div className={css['meta']}>
            <div className={css['time']}>
              <IconClock />
              <p className="font-xs-fixed">
                {(() => {
                  const startTime = moment.utc(props.event.start)
                  const endTime = moment.utc(props.event.end)
                  let startFormatted = startTime.format('MMM Do')
                  let endFormatted = endTime.format('MMM Do')

                  // If time of day is specified...
                  if (props.event.start && props.event.start.includes('T')) {
                    startFormatted += `, ${startTime.format('h:mm A')}`
                  }

                  if (props.event.end && props.event.end.includes('T')) {
                    endFormatted += `, ${endTime.format('h:mm A')}`
                  }

                  if (!endTime || startTime.isSame(endTime)) return startFormatted

                  return `${startFormatted} — ${endFormatted}`
                })()}
              </p>
            </div>
            {props.event.type && <div className={`label ${css[props.event.type] || 'black'}`}>{props.event.type}</div>}
          </div>
        </div>
      </div>
    </ThumbnailBlock>
  )
}
