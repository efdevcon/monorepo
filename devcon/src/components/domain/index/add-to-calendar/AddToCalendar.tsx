import React from 'react'
import { Button } from 'components/common/button'
import css from './add-to-calendar.module.scss'
import { useTranslations } from 'next-intl'
import { Modal } from 'components/common/modal'
import { Link } from 'components/common/link'
import AddToCalendarIcon from 'assets/icons/calendar.svg'
import moment, { Moment } from 'moment'
import { leftPad } from 'utils/left-pad'

type EventData = {
  id: string
  title: string
  description: string
  location?: string
  startDate: Moment
  endDate: Moment
}

const formatTimeOfDay = (date: Moment) => {
  return `${leftPad(date.get('hours'))}${leftPad(date.get('minutes'))}${leftPad(date.get('seconds'))}`
}

export const generateAddToCalendarUrls = (event: EventData) => {
  const { id, title, description, location, startDate, endDate } = event

  const start = startDate.clone()
  const end = endDate.clone()
  const isMultiDayEvent = !start.isSame(end, 'days')

  const startOfFirstDay = formatTimeOfDay(start)
  const endOfLastDay = formatTimeOfDay(end)

  const googleCalUrl = (() => {
    const googleCalUrl = new URL(`https://www.google.com/calendar/render?action=TEMPLATE&ctz=America/Bogota`)

    googleCalUrl.searchParams.append('text', title)
    googleCalUrl.searchParams.append('details', description)
    if (location) googleCalUrl.searchParams.append('location', location)

    return googleCalUrl
  })()

  const ics = [`BEGIN:VCALENDAR`, `PRODID:devcon.org`, `METHOD:PUBLISH`, `VERSION:2.0`, `CALSCALE:GREGORIAN`] as any

  if (isMultiDayEvent) {
    // Have to add a day for multi-day events since the final day is not included in the range
    // (if not, it will make a boundary at exactly midnight on the previous day since the dates default to 00:00 when no time is specified)
    end.add(1, 'days')

    googleCalUrl.searchParams.append('dates', `${start.format('YYYYMMDD')}/${end.format('YYYYMMDD')}`)

    ics.push(
      `BEGIN:VEVENT`,
      `UID:${id}`,
      `DTSTAMP:${moment.utc().format('YYYYMMDDTHHmmss')}`,
      `DTSTART:${start.format('YYYYMMDD')}`,
      `DTEND:${end.format('YYYYMMDD')}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      location && `LOCATION:${location}`,
      `END:VEVENT`
    )
  } else {
    googleCalUrl.searchParams.append(
      'dates',
      `${start.format('YYYYMMDD')}T${startOfFirstDay}/${end.format('YYYYMMDD')}T${endOfLastDay}`
    )
    ics.push(
      `BEGIN:VEVENT`,
      `UID:${id}`,
      `DTSTAMP:${moment.utc().format('YYYYMMDDTHHmmss')}`,
      `DTSTART:${start.format('YYYYMMDD')}T${startOfFirstDay}`,
      `DTEND:${end.format('YYYYMMDD')}T${endOfLastDay}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      location && `LOCATION:${location}`,
      // event.Location.url && `URL;VALUE=URI:${event.Location.url}`,
      // event.Location.url && `LOCATION:${event.Location.text}`,
      `END:VEVENT`
    )
  }

  ics.push(`END:VCALENDAR`)

  return {
    ics,
    google: googleCalUrl,
  }
}

const AddToCalendar = (props: any) => {
  const [calendarModalOpen, setCalendarModalOpen] = React.useState(false)
  const intl = useTranslations()

  const { google, ics } = generateAddToCalendarUrls(
    props.event || {
      id: 'Devcon Main Event',
      title: 'Devcon',
      description:
        'Devcon will officially run from October 11th-14th, but come a few days earlier and stay a little later to experience the full Devcon Week which will run from October 7th-16th!',
      location: 'Agora Bogotá Convention Center',
      startDate: moment.utc('2022-10-11'),
      endDate: moment.utc('2022-10-14'),
    }
  )

  const triggerModal = () => setCalendarModalOpen(true)

  return (
    <>
      {props.children ? (
        React.cloneElement(props.children, { onClick: triggerModal })
      ) : (
        <Button className={`${css['button']} bold black text-uppercase hover`} onClick={triggerModal}>
          <AddToCalendarIcon /> <span className={css['button-text']}>{intl('add-to-calendar')}</span>
        </Button>
      )}

      {calendarModalOpen && (
        <Modal className={css['modal']} open={calendarModalOpen} close={() => setCalendarModalOpen(false)}>
          <div className={css['modal-content']}>
            <p className="bold uppercase clear-bottom">{intl('add-to-calendar')}:</p>

            <div className={css['buttons']}>
              <a
                href={(() => {
                  const file = new Blob([ics.filter((row: string) => !!row).join('\n')], { type: 'text/calendar' })

                  return URL.createObjectURL(file)
                })()}
                download="Devcon.ics"
              >
                <Button className="black ghost">Download (.ICS)</Button>
              </a>

              <Link to={google.href}>
                <Button className="black ghost">Google Calendar</Button>
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

export default AddToCalendar
