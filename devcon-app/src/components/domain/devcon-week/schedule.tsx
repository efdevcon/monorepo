import React, { useEffect } from 'react'
import css from './schedule.module.scss'
import moment from 'moment'
import momentTZ from 'moment-timezone'
import ListIcon from 'assets/icons/list.svg'
import CalendarIcon from 'assets/icons/calendar.svg'
import PeopleIcon from 'assets/icons/people.svg'
import ChevronDown from 'assets/icons/chevron-down.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'
import AddToCalendarIcon from 'assets/icons/calendar.svg'
import SwipeToScroll from 'components/common/swipe-to-scroll'
import { Message } from 'components/common/message'
import { Link } from 'components/common/link'
import { Modal } from 'components/common/modal'
// import ScheduleBackground from 'assets/images/schedule-bg.svg'
import { Dropdown } from 'components/common/dropdown'
import DevconnectAmsterdam from 'assets/images/amsterdam-logo-with-eth.svg'
import { useRouter } from 'next/dist/client/router'
// @ts-ignore
import Toggle from 'react-toggle'
import { useTranslations } from 'next-intl'

export const useDraggableLink = () => {
  const dragging = React.useRef(false)

  return {
    onMouseDown: () => {
      dragging.current = false
    },
    onMouseMove: () => {
      dragging.current = true
    },
    onClick: (e: React.SyntheticEvent) => {
      e.stopPropagation()

      if (dragging.current) {
        e.preventDefault()
      }
    },
    draggable: false,
  }
}

const sortEvents = (a: any, b: any) => {
  const aStartDay = moment(a.Date.startDate),
    aEndDay = moment(a.Date.endDate),
    aTotalDays = aEndDay.diff(aStartDay, 'days') + 1
  const bStartDay = moment(b.Date.startDate),
    bEndDay = moment(b.Date.endDate),
    bTotalDays = bEndDay.diff(bStartDay, 'days') + 1

  if (aStartDay.isBefore(bStartDay)) {
    return -1
  } else if (aStartDay.isSame(bStartDay)) {
    if (aTotalDays > bTotalDays) return -1
    if (bTotalDays > aTotalDays) return 1

    return 0
  } else {
    return 1
  }
}

const getEventBoundaries = (events: any) => {
  let min: moment.Moment | undefined, max: moment.Moment | undefined

  events.forEach((event: any) => {
    const startDay = moment.utc(event.Date.startDate),
      endDay = moment.utc(event.Date.endDate)

    if (min ? startDay.isBefore(min) : true) min = startDay
    if (max ? endDay.isAfter(max) : true) max = endDay
  })

  return { min, max }
}

const calculateEventDuration = (min: moment.Moment | undefined, max: moment.Moment | undefined) => {
  if (max && min) {
    return max?.diff(min, 'days') + 1
  }

  return 0
}

const htmlEscape = (input: string) => {
  input = input.replace(/&/g, '&amp;')
  input = input.replace(/</g, '&lt;')
  input = input.replace(/>/g, '&gt;')
  return input
}

const htmlDecode = (content: string) => {
  let e = document.createElement('div')
  e.innerHTML = content
  return e.childNodes.length === 0 ? '' : (e.childNodes[0].nodeValue as any)
}

const leftPadNumber = (number: number) => {
  if (number < 10) {
    return `0${number}`
  }

  return number
}

// Confirm time format is consistent e.g. 09:30 or 17:30
const sanitizeEventTime = (eventTime: string) => {
  if (!eventTime) return null

  const normalizedEventTime = eventTime.trim()
  const isCorrectFormat = normalizedEventTime.match(/\d{2}:\d{2}/) !== null

  if (isCorrectFormat) {
    const asMoment = moment.duration(normalizedEventTime)

    return {
      calendarTime: `${leftPadNumber(asMoment.get('hours'))}${leftPadNumber(asMoment.get('minutes'))}${leftPadNumber(
        asMoment.get('seconds')
      )}`,
      normalizedEventTime,
    }
  }

  return null
}

// Events have a bunch of date formatting going on, heres a utility to generate them:
const getFormattedEventData = (event: any, day?: any) => {
  const currentDate = day
  const startDate = moment.utc(event.Date.startDate)
  const endDate = moment.utc(event.Date.endDate)
  const formattedDate = currentDate && currentDate.format('MMM DD')
  const formattedStartDate = startDate.format('MMM DD')
  const formattedEndDate = endDate.format('MMM DD')
  const duration = calculateEventDuration(startDate, endDate)
  const isMultiDayEvent = duration > 1
  const timeOfDayArray = event['Time of Day'] && event['Time of Day'].split(',')
  // If its a multi day event but only one time is specified, we assume that is the time of day for the entire week
  const shouldRepeatTimeOfDay = isMultiDayEvent && timeOfDayArray.length === 1
  const timeOfDayIndex = currentDate ? currentDate.diff(startDate, 'days') : 0
  const timeOfDay = timeOfDayArray && timeOfDayArray[shouldRepeatTimeOfDay ? 0 : timeOfDayIndex]

  return {
    currentDate,
    startDate,
    endDate,
    formattedDate,
    formattedStartDate,
    formattedEndDate,
    duration,
    isMultiDayEvent,
    shouldRepeatTimeOfDay,
    timeOfDayArray,
    timeOfDayIndex,
    timeOfDay,
  }
}

// Overall schedule data (for the whole week, as opposed to the individual events)
const useScheduleData = (events: any) => {
  const scheduleHelpers = React.useMemo(() => {
    const { min, max } = getEventBoundaries(events)
    const scheduleDuration = calculateEventDuration(min, max)
    const sortedEvents = events.slice().sort(sortEvents)
    const eventsByDay = {} as { [key: number]: any[] }

    // Group events by their dates (including spreading out over multiple days if events are multiday) - makes it easier to work with later, e.g. to check if a given day in the event range actually has events or not
    sortedEvents
      .slice()
      // Turns out reversing the "timeline view" sorting algorithm yields good results for multi-day events in list view
      .reverse()
      .forEach((event: any) => {
        const eventBoundaries = getEventBoundaries([event])
        const firstDay = eventBoundaries.min ? eventBoundaries.min.diff(min, 'days') : 0
        const lastDay = eventBoundaries.max ? eventBoundaries.max.diff(min, 'days') + 1 : 1

        for (let i = firstDay; i < lastDay; i++) {
          const dayIsIndexed = !!eventsByDay[i]

          if (dayIsIndexed) {
            eventsByDay[i] = [event, ...eventsByDay[i]]
          } else {
            eventsByDay[i] = [event]
          }
        }
      })

    return {
      sortedEvents,
      events,
      eventsByDay,
      scheduleDuration,
      min,
      max,
    }
  }, [events])

  return scheduleHelpers
}

// Utility function for keeping track of placed nodes (used by calendar view algo)
const createPlacementTracker = () => {
  const occupiedNodes = {} as {
    [key: number]: {
      [key: number]: boolean
    }
  }

  return {
    occupiedNodes,
    placeItem: (currentRow: number, start: number, duration: number) => {
      const canBePlaced = typeof occupiedNodes?.[currentRow]?.[start] === 'undefined'

      if (canBePlaced) {
        for (let i = start; i < start + duration; i++) {
          occupiedNodes[currentRow] = {
            ...occupiedNodes[currentRow],
            [i]: true,
          }
        }

        return true
      }

      return false
    },
  }
}

// Timeline view (as opposed to list view)
const Timeline = (props: any) => {
  const { min, sortedEvents, events: defaultSortEvents, scheduleDuration, eventsByDay } = props
  const placementTracker = createPlacementTracker()
  const [eventModalOpen, setEventModalOpen] = React.useState('')
  const draggableAttributes = useDraggableLink()
  const devconDates = [moment('2022-10-11'), moment('2022-10-12'), moment('2022-10-13'), moment('2022-10-14')]

  // Virtualizing/precomputing the entire grid before rendering it could simplify it greatly...
  // ...but likely not relevant; a new schedule component will be created soon...
  const truncatedDays = {} as { [key: string]: boolean }
  let totalTruncatedDays = {} as any[]
  // Record the indexes of all truncated events for use in the rendering algorithm
  const truncationsByIndex = [] as number[]

  const events = sortedEvents.map((event: any, index: number) => {
    const {
      startDate: startDay,
      isMultiDayEvent,
      duration: totalDays,
      timeOfDayArray,
      shouldRepeatTimeOfDay,
    } = getFormattedEventData(event)
    const offsetFromFirstDay = startDay.diff(min, 'days') + 1
    const offsetFromFirstEventInSchedule = startDay.diff(moment.utc(sortedEvents[0].Date.startDate), 'days')
    let subtractDays = truncationsByIndex.reduce((acc, val) => {
      if (val < offsetFromFirstDay) {
        return acc + 1
      }

      return acc
    }, 0)

    isNaN(totalTruncatedDays[offsetFromFirstEventInSchedule]) ? 0 : totalTruncatedDays[offsetFromFirstEventInSchedule]

    // We don't render empty days, so we have to account for that when placing items into our grid - we subtract the empty days prior to the current event, treating them as if they don't exist in the grid
    Array.from(Array(offsetFromFirstEventInSchedule)).forEach((_, index: number) => {
      const emptyDay = !eventsByDay[index]

      if (emptyDay) subtractDays++
    })

    const truncatedEventDuration = (() => {
      let truncating = false
      let days = totalDays

      for (let i = 0; i < totalDays; i++) {
        const currentDayIndex = offsetFromFirstEventInSchedule + i
        const allEventsOnDay = eventsByDay[currentDayIndex]
        const isOnlyEventOnDay = allEventsOnDay.length === 1

        if (isOnlyEventOnDay) {
          const isDevcon = allEventsOnDay.some((event: any) => event['Stable ID'] === 'Devcon')

          if (isDevcon) return days

          if (truncating) {
            days--

            truncationsByIndex.push(currentDayIndex)
          }

          truncating = true
        } else {
          truncating = false
        }
      }

      return days
    })()

    let currentRow = 1 // css property grid-row starts at 1

    /*
        1) Place at first available Y value in the start date column, filling in horizontally if multiple days
        2) If the column Y is already occupied (by another event extending into the day), increase column Y by 1, repeat until free space
          note: Horizontally there will always be room, by definition, because we are filling in left to right 
        3) Keep track of used grid slots along the way (to allow for step 2)
      */
    while (!placementTracker.placeItem(currentRow, offsetFromFirstDay - subtractDays, truncatedEventDuration)) {
      currentRow++
    }

    const gridPlacement = {
      gridRow: currentRow + 1, // Add 1 to account for the dates occupying the first row
      gridColumn: `${offsetFromFirstDay - subtractDays} / span ${truncatedEventDuration}`,
      '--eventLength': truncatedEventDuration,
    }

    return (
      <React.Fragment key={event.Name + offsetFromFirstDay}>
        <div
          className={`${css['event']} ${css[`ID-${event['Stable ID']}`]} ${css[event['Difficulty']]} expand-right`}
          style={gridPlacement}
          {...draggableAttributes}
          onClick={e => {
            draggableAttributes.onClick(e)

            if (!e.defaultPrevented) {
              setEventModalOpen(event.Name)
            }
          }}
        >
          <div className={css['content']}>
            <div className={css['content-inner']}>
              <div className={css['top']}>
                <p
                  className={`font-xl-em ${event['Stable ID'] === 'Devcon' ? 'font-xxl-em' : ''} bold ${css['title']} ${
                    totalDays === 1 ? css['single-day'] : ''
                  }`}
                >
                  {event.Name}
                </p>

                {event['Time of Day'] && (
                  <div className={css['when']}>
                    {Array.from(Array(totalDays)).map((_, index: number) => {
                      const time = timeOfDayArray[index]
                      const useDayIndicator = !!timeOfDayArray[1] && totalDays > 1
                      const sameTimeEveryDay = shouldRepeatTimeOfDay && totalDays > 1 && time !== 'FULL DAY'

                      if (!time) return null
                      if (shouldRepeatTimeOfDay && isMultiDayEvent && index > 0) return null

                      return null
                    })}
                  </div>
                )}
              </div>

              <div className={css['bottom']}>
                <div className={`${css['organizers']} bold`}>
                  {event['Organizer'] ? event['Organizer'].join(', ') : <p>Organizer</p>}
                </div>

                <EventMeta event={event} />
              </div>
            </div>
          </div>

          <LearnMore event={event} open={eventModalOpen === event.Name} close={() => setEventModalOpen('')} />
        </div>
      </React.Fragment>
    )
  })

  return (
    <>
      {/* <div className={`${css['timeline-background']} clear-vertical`}>
        <ScheduleBackground />
      </div> */}
      <SwipeToScroll /*focusRef={todayRef}*/ noBounds /*scrollIndicatorDirections={{ right: true }}*/>
        <div className={css['timeline']}>
          {events}

          {Array.from(Array(scheduleDuration)).map((_, index: number) => {
            if (truncatedDays[index]) return null // <div className={css['day']}>Truncated</div>

            const day = moment.utc(defaultSortEvents[0].Date.startDate).add(index, 'days')
            const date = day.format('MMM DD')
            const noEventsForDay = !eventsByDay[index]
            const now = momentTZ.tz(moment(), 'Europe/Amsterdam')
            const dayIsActive = day.isSame(now, 'day')
            const truncateNDays = (() => {
              const currentEvent = eventsByDay[index] && eventsByDay[index][0]
              let counter = 1

              if (eventsByDay[index].length > 1) return counter

              while (
                eventsByDay[counter + index] && // the next day has events
                eventsByDay[counter + index].length === 1 && // there's only one event the next day
                currentEvent === eventsByDay[counter + index][0] && // next days event is the same as the current event
                !devconDates.some(devconDate => devconDate.isSame(day, 'date'))
                // !['Oct 11', 'Oct 12', 'Oct 13', 'Oct 14'].includes(date) // No truncation of the devcon event range
              ) {
                truncatedDays[counter + index] = true

                counter++
              }

              return counter
            })()

            if (noEventsForDay) return null

            const shouldTruncate = truncateNDays > 1

            let className = css['day']

            if (dayIsActive) className += ` ${css['active']}`

            const weekdays = (() => {
              const firstDay = day.format('ddd')

              if (shouldTruncate) {
                return `${firstDay} - ${day
                  .clone()
                  .add(truncateNDays - 1, 'days')
                  .format('ddd')}`
              }

              return firstDay
            })()

            const isDevcon = (() => {
              return devconDates.some(devconDay => devconDay.isSame(day, 'date'))
            })()

            if (isDevcon) className += ` ${css['is-devcon']}`

            return (
              <div className={className} key={index}>
                <p className="bold">{weekdays}</p>
                <p className="bold">
                  {date}{' '}
                  {shouldTruncate &&
                    `- ${day
                      .clone()
                      .add(truncateNDays - 1, 'days')
                      .format('MMM DD')}`}
                </p>
              </div>
            )
          })}
        </div>
      </SwipeToScroll>
    </>
  )
}

const EventMeta = (props: any) => {
  return (
    <div className={css['meta']}>
      {props.event['General Size'] && props.event['General Size'].length > 0 && (
        <div className={`font-sm-em`} style={{ display: 'flex', alignItems: 'center' }}>
          <PeopleIcon className={`font-lg-em icon`} />
          &nbsp;{props.event['General Size']}
        </div>
      )}
      {/* {props.event['Difficulty'] && <div className={`font-sm-em ${css['difficulty']}`}>{props.event.Difficulty}</div>} */}

      <div className={css['categories']}>
        {props.event.Category &&
          props.event.Category.length > 0 &&
          props.event.Category.map((category: any) => {
            return (
              <div key={category} className={`label neutral font-xs-em`}>
                {category}
              </div>
            )
          })}
      </div>
    </div>
  )
}

const EventLinks = (props: any) => {
  const [calendarModalOpen, setCalendarModalOpen] = React.useState(false)
  const {
    startDate,
    timeOfDayArray,
    endDate,
    duration: eventDuration,
    isMultiDayEvent,
    event,
    shouldRepeatTimeOfDay,
  } = props
  const start = startDate.clone()
  const end = endDate.clone()
  const firstDay = timeOfDayArray[0]
  const lastDay = timeOfDayArray[timeOfDayArray.length - 1]

  const { calendarTime: startOfFirstDay } = sanitizeEventTime(firstDay.split('-')[0]) || { calendarTime: '000000' }
  const { calendarTime: endOfLastDay } = sanitizeEventTime(lastDay.split('-')[1]) || { calendarTime: '000000' }

  const description = (() => {
    let humanReadableTimes: string[] = []

    const allEventTimesValid = timeOfDayArray.every((time: string, index: number) => {
      const startOfDay = sanitizeEventTime(time.split('-')[0])
      const endOfDay = sanitizeEventTime(time.split('-')[1])
      const timeIsValid = startOfDay && endOfDay

      if (timeIsValid) {
        const timeOfDay = `${startOfDay.normalizedEventTime} - ${endOfDay.normalizedEventTime}`

        if (isMultiDayEvent && !shouldRepeatTimeOfDay) {
          humanReadableTimes.push(`Day ${index + 1}: ${timeOfDay}`)
        } else {
          humanReadableTimes.push(`${timeOfDay}`)
        }
      }

      return timeIsValid
    })

    if (!allEventTimesValid) return null

    return `${event['Name']} - ${humanReadableTimes.join(', ')}`
  })()

  const enableAddToCalendar = description !== null

  const googleCalUrl = (() => {
    const googleCalUrl = new URL(`https://www.google.com/calendar/render?action=TEMPLATE&ctz=Europe/Amsterdam`)
    // const googleCalUrl = new URL(`https://www.google.com/calendar/render?action=TEMPLATE`)

    googleCalUrl.searchParams.append('text', `${event.Name}`)
    googleCalUrl.searchParams.append('details', `${description}`)

    if (event.Location.url) googleCalUrl.searchParams.append('location', `${event.Location.text}`)

    return googleCalUrl
  })()

  const ics = [`BEGIN:VCALENDAR`, `PRODID:devconnect.org`, `METHOD:PUBLISH`, `VERSION:2.0`, `CALSCALE:GREGORIAN`]

  if (isMultiDayEvent) {
    // Have to add a day for multi-day events since the final day is not included in the range
    // (if not, it will make a boundary at exactly midnight on the previous day since the dates default to 00:00 when no time is specified)
    end.add(1, 'days')

    googleCalUrl.searchParams.append('dates', `${start.format('YYYYMMDD')}/${end.format('YYYYMMDD')}`)

    ics.push(
      `BEGIN:VEVENT`,
      `UID:${event.Name}`,
      `DTSTAMP:${moment.utc().format('YYYYMMDDTHHmmss')}`,
      `DTSTART:${start.format('YYYYMMDD')}`,
      `DTEND:${end.format('YYYYMMDD')}`,
      `SUMMARY:${event.Name}`,
      `DESCRIPTION:${description}`,
      event.Location.url && `URL;VALUE=URI:${event.Location.url}`,
      event.Location.url && `LOCATION:${event.Location.text}`,
      `END:VEVENT`
    )
  } else {
    googleCalUrl.searchParams.append(
      'dates',
      `${start.format('YYYYMMDD')}T${startOfFirstDay}/${end.format('YYYYMMDD')}T${endOfLastDay}`
    )

    ics.push(
      `BEGIN:VEVENT`,
      `UID:${event.Name}`,
      `DTSTAMP:${moment.utc().format('YYYYMMDDTHHmmss')}`,
      `DTSTART:${start.format('YYYYMMDD')}T${startOfFirstDay}`,
      `DTEND:${end.format('YYYYMMDD')}T${endOfLastDay}`,
      `SUMMARY:${event.Name}`,
      `DESCRIPTION:${description}`,
      event.Location.url && `URL;VALUE=URI:${event.Location.url}`,
      event.Location.url && `LOCATION:${event.Location.text}`,
      `END:VEVENT`
    )
  }

  ics.push(`END:VCALENDAR`)

  const file = new Blob([ics.filter((row: string) => !!row).join('\n')], { type: 'text/calendar' })
  const icsAttributes = {
    href: URL.createObjectURL(file),
    download: `${event.Name}.ics`,
  }

  const intl = useTranslations()

  return (
    <div className={`${css['event-links']} font-sm text-uppercase`}>
      {event.URL && event.URL.length > 0 ? (
        <Link to={event.URL} indicateExternal>
          {intl('devcon_week_visit_website')}
        </Link>
      ) : null}

      {event.Location && event.Location.url && (
        <Link to={event.Location.url} indicateExternal>
          {intl('devcon_week_location')}
        </Link>
      )}

      {event['Stream URL'] && (
        <Link to={event['Stream URL']} indicateExternal className="button xs orange-fill">
          {intl('devcon_week_stream')}
        </Link>
      )}

      {enableAddToCalendar && (
        <>
          <div className={css['add-to-calendar']}>
            <AddToCalendarIcon className={`big-text icon`} onClick={() => setCalendarModalOpen(true)} />
          </div>

          {calendarModalOpen && (
            <Modal
              className={css['add-to-calendar-modal']}
              open={calendarModalOpen}
              close={() => setCalendarModalOpen(false)}
            >
              <div className={css['add-to-calendar-modal-content']}>
                <p className="bold text-uppercase">Add event to your calendar:</p>

                <a {...icsAttributes} className="button sm font-sm">
                  Download (.ICS)
                </a>

                <Link indicateExternal to={googleCalUrl.href} className="button sm font-sm">
                  Google Calendar
                </Link>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  )
}

const LearnMore = (props: { open: boolean; close: () => void; event: any }) => {
  const intl = useTranslations()
  let className = css['learn-more']

  return (
    <>
      <div className={`${className} font-xs-em bold`} style={{ display: 'flex', justifyContent: 'space-between' }}>
        <p>{intl('learn_more')} →</p>
        {props.event['Attend'] && <p className={css['attend-details']}>{props.event['Attend']}</p>}
      </div>

      <Modal open={props.open} close={props.close} className={css['learn-more-modal']} unstyled>
        <div className={css['learn-more-modal-content']}>
          <ListEventMobile {...getFormattedEventData(props.event)} event={props.event} timeline />
        </div>
      </Modal>
    </>
  )
}

const ListDayHeader = React.forwardRef((props: any, ref: any) => {
  // const [open, setOpen] = React.useState(true)
  const day = props.date.format('dddd')
  const date = props.date.format('MMM DD')
  const now = momentTZ.tz(moment(), 'Europe/Amsterdam')
  const dayIsActive = props.date.isSame(now, 'day')
  const [open, setOpen] = React.useState(dayIsActive)

  let className = css['day-header']

  // if (dayIsActive) className += ` ${css['active']}`
  if (open) className += ` ${css['open']}`

  React.useImperativeHandle(ref, () => {
    return {
      open: () => setOpen(true),
      close: () => setOpen(false),
    }
  })

  return (
    <div>
      <div className={className} onClick={() => setOpen(!open)}>
        <div className={css['date']}>
          <p className="section-header thin font-lg">{dayIsActive ? 'TODAY' : day}</p>
          <p className="section-header thin font-sm">{date}</p>
        </div>

        <div className={css['toggle-open']}>{open ? <ChevronUp /> : <ChevronDown />}</div>
      </div>
      {open && props.children}
    </div>
  )
})

ListDayHeader.displayName = 'ListDayHeader'

const ListEventMobile = (props: any) => {
  const { formattedDate, timeOfDay, isMultiDayEvent, formattedStartDate, formattedEndDate } = props
  const intl = useTranslations()

  return (
    <div className={`${css['event']} ${css[`ID-${props.event['Stable ID']}`]} ${css[props.event['Difficulty']]} `}>
      <div className={css['content']}>
        {props.event.URL ? (
          <Link to={props.event.URL} indicateExternal className={`${css['title']} font-lg text-uppercase bold`}>
            {props.event.Name}
          </Link>
        ) : (
          <p className={`${css['title']} font-lg text-uppercase bold`}>{props.event.Name}</p>
        )}

        {props.event.Location && props.event.Location.url && (
          <Link
            to={props.event.Location.url}
            indicateExternal
            className={`${css['location']} big-text-bold text-uppercase`}
          >
            {props.event.Location.text}
          </Link>
        )}

        <div className={css['date']}>
          <p className={`font-sm text-uppercase ${css['time-of-day']}`}>
            {formattedDate} — <br /> <span className="font-lg">{timeOfDay}</span>
            {props.event['Stable ID'] === 'Cowork' && (
              <>
                <br />
                <span className="font-sm bold">Social hours 18:00 - 20:00 🎉</span>
              </>
            )}
          </p>
          {isMultiDayEvent && (
            <p className={`${css['end-date']} font-sm text-uppercase`}>
              {formattedStartDate} — {formattedEndDate}
            </p>
          )}
        </div>
        {isMultiDayEvent && (
          <div className={`label font-xs ${css['multi-day-indicator']}`}>{intl('devcon_week_multi_day_event')}</div>
        )}
        {/* {props.event['Stable ID'] === 'Cowork' && <DevconnectAmsterdam style={{ width: '50px', display: 'block' }} />} */}
        {props.event['Description'] && (
          <p
            className={`${css['description']} font-sm`}
            dangerouslySetInnerHTML={{ __html: htmlDecode(htmlEscape(props.event['Description'])) }}
          />
        )}

        {/* {props.event['Stable ID'] === 'Easter' && props.timeline && (
          <img src="https://c.tenor.com/thDFJno0zuAAAAAd/happy-easter-easter-bunny.gif" alt="Easter egg" width="100%" />
        )} */}

        {props.event['Organizer'] && (
          <p className={`text-uppercase ${css['organizers']}`}>{props.event['Organizer'].join(', ')}</p>
        )}
        {props.event['Attend'] &&
          (props.event['URL'] ? (
            <Link
              to={props.event.URL}
              indicateExternal
              className={`${css['ticket-availability']} bold border-top border-bottom purple font-sm text-uppercase`}
            >
              {props.event['Attend']}
            </Link>
          ) : (
            <p className={`${css['ticket-availability']} bold border-top border-bottom purple font-sm text-uppercase`}>
              {props.event['Attend']}
            </p>
          ))}
        <div className={css['bottom']}>
          <EventMeta event={props.event} />
        </div>
      </div>
      <EventLinks {...props} />
    </div>
  )
}

const useFilter = (events: any) => {
  const keysToFilterOn = ['Category', 'Difficulty', 'Attend']
  const [filters, setFilters] = React.useState({} as { [key: string]: any })
  const filterableValues = {} as { [key: string]: Set<string> }
  const [hideSoldOut, setHideSoldOut] = React.useState(false)

  // Run through events collecting all the possible values to filter on for the specified keys above - looks a bit messy but w/e
  // Could hardcode the filter values too but this is future proof if someone changes the range of possible values for any of the above fields
  events.forEach((event: any) => {
    keysToFilterOn.forEach((key: any) => {
      const value = event[key]
      if (value) {
        if (!filterableValues[key]) filterableValues[key] = new Set()

        if (Array.isArray(value)) {
          value.forEach((val: any) => {
            if (!filterableValues[key].has(val)) filterableValues[key].add(val)
          })
        } else {
          if (!filterableValues[key].has(value)) filterableValues[key].add(event[key])
        }
      }
    })
  })

  const activeFilters = Object.keys(filters)

  const filteredEvents = events.filter((event: any) => {
    if (hideSoldOut && ['sold out', 'applications closed'].includes(event['Attend'] && event['Attend'].toLowerCase())) {
      return false
    }

    if (activeFilters.length > 0) {
      return activeFilters.every(key => {
        const activeFilter = filters[key]

        if (Array.isArray(event[key])) return event[key].includes(activeFilter)

        return activeFilter === event[key]
      })
    }

    return true
  })

  return {
    events: filteredEvents,
    keysToFilterOn,
    filterableValues,
    hideSoldOut,
    setHideSoldOut,
    filters,
    onChange: (key: string, value: string) => {
      const nextFilter = {
        ...filters,
        [key]: value,
      } as { [key: string]: string }

      if (!value) delete nextFilter[key]

      setFilters(nextFilter)
    },
  }
}

const Filter = (props: any) => {
  return (
    <div className={`${css['filter']} font-sm`}>
      <p className={`${css['filter-text']} bold`}>Filter:</p>
      {props.keysToFilterOn.map((key: string) => {
        const valuesToFilterBy = props.filterableValues[key]

        if (!valuesToFilterBy) return null

        return (
          <div key={key} className="font-xs">
            <Dropdown
              placeholder={key}
              value={props.filters[key]}
              onChange={val => props.onChange(key, val)}
              options={Array.from(props.filterableValues[key]).map(filterValue => {
                return {
                  text: filterValue,
                  value: filterValue,
                }
              })}
            />
          </div>
        )
      })}

      {/* <label className={css['hide-sold-out']}>
        <Toggle defaultChecked={props.hideSoldOut} onChange={() => props.setHideSoldOut(!props.hideSoldOut)} />
        <span>Hide sold out events</span>
      </label> */}
    </div>
  )
}

const scheduleViewHOC = (Component: any) => {
  const ComponentWithScheduleView = (props: any) => {
    const [scheduleView, setScheduleView] = React.useState('timeline')

    const router = useRouter()

    useEffect(() => {
      const hash = window.location.hash

      if (hash && hash === '#list') {
        setScheduleView('list')
        router.replace(router.pathname)
      }
    }, [])

    return <Component {...props} scheduleView={scheduleView} setScheduleView={setScheduleView} />
  }

  return ComponentWithScheduleView
}

const Schedule = scheduleViewHOC((props: any) => {
  const { scheduleView, setScheduleView } = props
  const { events, ...filterAttributes } = useFilter(props.events)
  const intl = useTranslations()

  const scheduleHelpers = useScheduleData(events)
  const accordionRefs = React.useRef({} as { [key: string]: any })

  React.useEffect(() => {
    if (filterAttributes.filters) {
      Object.values(accordionRefs.current).forEach(acc => acc && acc.open && acc.open())
    }
  }, [filterAttributes.filters])

  return (
    <div className={`${css['schedule']}`} id="schedule">
      <div className="fade-in-up clear-vertical">
        <div className="section">
          <div className={`${css['header-row']}`}>
            <h2 className="spaced">{intl('devcon_week_schedule')}</h2>
            {/* <div className={`${css['view']} font-sm`}>
            <div className={css['options']}>
              <button
                className={`${scheduleView === 'list' && css['selected']} ${css['switch']}`}
                onClick={() => setScheduleView('list')}
              >
                <ListIcon style={{ fontSize: '1.1em' }} />
                <p className={`${css['text']} font-sm`}>List</p>
              </button>
              <button
                className={`${scheduleView === 'timeline' && css['selected']} ${css['switch']}`}
                onClick={() => setScheduleView('timeline')}
              >
                <CalendarIcon />
                <p className={`${css['text']} font-sm`}>Timeline</p>
              </button>
            </div>
          </div> */}
          </div>

          {/* <Message title="Ticket Information">
          <b>
            EACH event in devconnect is independently hosted and you will require tickets for each event you wish to
            attend.
          </b>
          &nbsp;For information on acquiring tickets to the independently-hosted events during the week of Devconnect
          please visit their respective websites.
        </Message> */}

          {/* <div className={`${css['top-bar']}`}>
            <Filter events={events} {...filterAttributes} />
            <Expand accordionRefs={accordionRefs} scheduleView={scheduleView} />

            {scheduleView === 'timeline' && (
              <p className={`font-sm text-uppercase ${css['swipe']}`}>Hold and drag schedule for more →</p>
            )}
          </div> */}
        </div>

        {events.length === 0 ? (
          <div className={css['no-results']}>
            <p>No matches for this filter</p>
          </div>
        ) : (
          <div className="section">
            {/* <div className={`${css['top-bar']}`}>
                <p className={`${css['timezone']} font-sm`}>
                  {momentTZ.tz('Europe/Amsterdam').format('HH:mm')} (UTC/GMT +1)
                </p>
                {scheduleView === 'calendar' && <p className={`font-sm ${css['swipe']}`}>Drag for more →</p>}
              </div> */}

            {scheduleView === 'timeline' && <Timeline {...scheduleHelpers} />}
          </div>
        )}
      </div>
    </div>
  )
})

export default Schedule
