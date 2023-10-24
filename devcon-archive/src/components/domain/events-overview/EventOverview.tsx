import moment from 'moment'
import React from 'react'
import { Event as EventType } from 'src/types/Event'
import css from './events.module.scss'
import EventIcon from 'src/assets/icons/event_add.svg'
import { GetDomainName } from 'src/utils/formatting'

interface EventOverviewProps {
  data: Array<EventType>
}

export function EventOverview(props: EventOverviewProps) {
  const renderEventDate = (event: EventType) => {
    const start = moment(event.startDate)
    const end = moment(event.endDate)

    if (start.day() === end.day()) {
      return start.format('MMM DD YYYY')
    }
    if (start.month() === end.month()) {
      return `${start.format('MMM')} ${start.format('DD')}-${end.format('DD')} ${start.format('YYYY')}`
    }
    return `${start.format('MMM DD')}-${end.format('MMM DD')} ${end.format('YYYY')}`
  }

  const downloadIcs = (event: EventType) => {
    const start = moment(event.startDate).format('YYYYMMDD')
    const end = moment(event.endDate).format('YYYYMMDD')

    const ics = `BEGIN:VCALENDAR
METHOD:PUBLISH
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:${event.title}
BEGIN:VEVENT
UID:${event.id}
DTSTART;VALUE=DATE:${start}
DTEND;VALUE=DATE:${end}
SUMMARY:${event.title}
DESCRIPTION:${event.title}
URL;VALUE=URI:${event.url}
LOCATION:${event.url}
END:VEVENT
END:VCALENDAR`

    const element = document.createElement('a')
    const file = new Blob([ics], { type: 'text/plain;charset=utf-8' })
    element.href = URL.createObjectURL(file)
    element.download = `${event.title}.ics`
    document.body.appendChild(element)
    element.click()
  }

  return (
    <div className={css['events']}>
      {props.data.map((event: EventType) => {
        return (
          <div key={event.id} className={css['event']}>
            <div className={css['date-column']}>
              <a href={event.url} target="_blank" rel="oopener noreferrer">
                <span className={css['day']}>{moment(event.startDate).format('DD')}</span>
                <span className={css['month']}>{moment(event.startDate).format('MMM')}</span>
              </a>

              <span
                role="button"
                aria-label={`Add ${event.title}`}
                className={css['event-add']}
                onClick={() => downloadIcs(event)}
              >
                <EventIcon />
              </span>
            </div>
            <div className={css['description']}>
              <a href={event.url} target="_blank" rel="oopener noreferrer">
                <p className={css['date']}>{renderEventDate(event)}</p>
                <p className={css['title']}>{event.title}</p>

                <span className={css['url']}>{GetDomainName(event.url)}</span>
              </a>
            </div>
            <div>
              <a href={event.url} target="_blank" rel="oopener noreferrer">
                <div className={css['image-column']}>
                  <img src={event.imageUrl} alt={event.title} />
                </div>
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
