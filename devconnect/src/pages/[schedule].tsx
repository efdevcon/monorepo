import { NextPage } from 'next'
import Image from 'next/image'
import React, { useEffect } from 'react'
import { Client } from '@notionhq/client'
import css from './[schedule].module.scss'
import { Footer } from './index'
import moment from 'moment'
import momentTZ from 'moment-timezone'
import ListIcon from 'assets/icons/list.svg'
import CalendarIcon from 'assets/icons/calendar.svg'
import PeopleIcon from 'assets/icons/people.svg'
import ChevronDown from 'assets/icons/chevron-down.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'
import AddToCalendarIcon from 'assets/icons/add-to-calendar.svg'
import SwipeToScroll from 'common/components/swipe-to-scroll'
import { SEO } from 'common/components/SEO'
import Hero from 'common/components/hero'
import Link, { useDraggableLink } from 'common/components/link'
import Modal from 'common/components/modal'
import ScheduleBackgroundAmsterdam from 'assets/images/schedule-bg.svg'
import DevconnectIstanbul from 'assets/images/istanbul-logo-with-eth.svg'
import DevconnectAmsterdam from 'assets/images/amsterdam-logo-with-eth.svg'
import DevconnectIstanbulText from 'assets/images/istanbul-logo-text.svg'
import Alert from 'common/components/alert'
import { useRouter } from 'next/dist/client/router'
// @ts-ignore
import Toggle from 'react-toggle'
import Retro from 'common/components/pages/event/retro'
import { CopyToClipboard } from 'common/components/copy-to-clipboard/CopyToClipboard'
import FilterMiss from 'assets/images/404.png'
import { useSearchParams } from 'next/navigation'
import ScheduleDownloadIcon from 'assets/icons/schedule_download.svg'
import TwirlIcon from 'assets/icons/twirl.svg'
import FilterIcon from 'assets/icons/filter.svg'
import SearchIcon from 'assets/icons/search.svg'
import ListComponent from 'common/components/list'
import StarNormal from 'assets/icons/star-normal.svg'
import StarFill from 'assets/icons/star-fill.svg'
import Tooltip from 'common/components/tooltip'
import CalendarPlus from 'assets/icons/calendar-plus.svg'
import CalendarMenu from 'assets/icons/calendar-menu.svg'
import InfoIcon from 'assets/icons/info.svg'
import ExportModalImage from 'assets/images/schedule/modal-export.png'
import ShareModalImage from 'assets/images/schedule/modal-share.png'
import EventAdd from 'assets/icons/event_added.svg'

const favoritedEventsThisSession = new Set()

// ICS and google cal generator
const generateCalendarExport = (events: any[]) => {
  const ics = [`BEGIN:VCALENDAR`, `PRODID:devconnect.org`, `METHOD:PUBLISH`, `VERSION:2.0`, `CALSCALE:GREGORIAN`]
  let googleCalUrl: any

  events.forEach((eventData: any) => {
    const { startDate, timeOfDayArray, endDate, isMultiDayEvent, event, shouldRepeatTimeOfDay } = eventData

    const start = startDate.clone()
    const end = endDate.clone()
    const firstDay = timeOfDayArray[0]
    const lastDay = timeOfDayArray[timeOfDayArray.length - 1]

    const { calendarTime: startOfFirstDay } = sanitizeEventTime(firstDay.split('-')[0]) || { calendarTime: null }
    const { calendarTime: endOfLastDay } = sanitizeEventTime(lastDay.split('-')[1]) || { calendarTime: null }

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

      if (!allEventTimesValid) return event.Name

      return `${event['Name']} - ${humanReadableTimes.join(', ')}`
    })()

    googleCalUrl = (() => {
      const googleCalUrl = new URL(`https://www.google.com/calendar/render?action=TEMPLATE&ctz=Europe/Istanbul`)

      googleCalUrl.searchParams.append('text', `${event.Name}`)
      googleCalUrl.searchParams.append('details', `${description}`)

      if (event.Location.url) googleCalUrl.searchParams.append('location', `${event.Location.text}`)

      return googleCalUrl
    })()

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
      const timeOfDayStart = startOfFirstDay ? `T${startOfFirstDay}` : 'T000000'
      const timeOfDayEnd = endOfLastDay ? `T${endOfLastDay}` : 'T000000'
      let endDate = end

      const isAllDayEvent = timeOfDayStart === 'T000000' && timeOfDayEnd === 'T000000'

      // If single day event and no times are specified, we create an "all day event" in the calendar
      if (isAllDayEvent) {
        // No time of day for google for all day events https://stackoverflow.com/questions/37335415/link-to-add-all-day-event-to-google-calendar
        googleCalUrl.searchParams.append('dates', `${start.format('YYYYMMDD')}/${endDate.format('YYYYMMDD')}`)

        // https://stackoverflow.com/questions/1716237/single-day-all-day-appointments-in-ics-files- ics requires adding a day to the end of the event ("midnight to start of next day")
        endDate = endDate.clone().add(1, 'days')
      } else {
        googleCalUrl.searchParams.append(
          'dates',
          `${start.format('YYYYMMDD')}${timeOfDayStart}/${endDate.format('YYYYMMDD')}${timeOfDayEnd}`
        )
      }

      ics.push(
        `BEGIN:VEVENT`,
        `UID:${event.Name}`,
        `DTSTAMP:${moment.utc().format('YYYYMMDDTHHmmss')}`,
        `DTSTART:${start.format('YYYYMMDD')}${timeOfDayStart}`,
        `DTEND:${endDate.format('YYYYMMDD')}${timeOfDayEnd}`,
        `SUMMARY:${event.Name}`,
        `DESCRIPTION:${description}`,
        event.Location.url && `URL;VALUE=URI:${event.Location.url}`,
        event.Location.url && `LOCATION:${event.Location.text}`,
        `END:VEVENT`
      )
    }
  })

  ics.push(`END:VCALENDAR`)

  const calendarName = events.length === 1 ? events[0].event.Name : 'Devconnect Week'

  const file = new Blob([ics.filter((row: string) => !!row).join('\n')], { type: 'text/calendar' })
  const icsAttributes = {
    href: URL.createObjectURL(file),
    download: `${calendarName}.ics`,
  }

  return { icsAttributes, googleCalUrl: googleCalUrl && googleCalUrl.href }
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

    if (a.Domain && !b.Domain) return -1
    if (!a.Domain && b.Domain) return 1

    if (a.isVirtualEvent && !b.isVirtualEvent) return 1
    if (b.isVirtualEvent && !a.isVirtualEvent) return -1

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
  input = input.replace(/\n/g, '<br />')
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

const CalendarModal = ({ events, calendarModalOpen, setCalendarModalOpen, allowGoogle, favorites }: any) => {
  if (!calendarModalOpen) return null

  const { icsAttributes, googleCalUrl } = generateCalendarExport(
    events.map((event: any) => {
      return {
        ...getFormattedEventData(event),
        event,
      }
    })
  )

  const isGlobalExport = !!favorites // if favorites are passed as a prop its a global export
  const hasMultipleEvents = isGlobalExport && events.length > 1

  return (
    <Modal
      className={css['add-to-calendar-modal']}
      open={calendarModalOpen}
      close={() => setCalendarModalOpen(false)}
      noCloseIcon
    >
      <div className={css['add-to-calendar-modal-content']}>
        <div className={css['modal-header']}>
          <Image src={ExportModalImage} alt="Twirl graphic" quality={100} />
          <div className={css['content']}>
            <p className={css['meta']}>Export schedule</p>
          </div>
        </div>

        <div className={css['description']}>
          <p className="bold margin-bottom-much-less">Export Schedule to Calendar (.ICS)</p>
          <p className="small-text">Download the .ICS file to upload to your favorite calendar app.</p>
        </div>

        <div className={css['buttons']}>
          {(() => {
            if (favorites && favorites.favoriteEvents.length > 0) {
              const { icsAttributes } = generateCalendarExport(
                events
                  .filter((event: any) => {
                    const eventIsFavorited = favorites.favoriteEvents.some(
                      (favoritedEvent: any) => event.ShortID === favoritedEvent
                    )

                    if (!eventIsFavorited) return false

                    return true
                  })
                  .map((event: any) => {
                    return {
                      ...getFormattedEventData(event),
                      event,
                    }
                  })
              )

              return (
                <a {...icsAttributes} className="button orange-fill sm small-text">
                  <StarNormal /> Your Favorites (.ICS)
                </a>
              )
            }
            return null
          })()}

          <a {...icsAttributes} className="button orange sm small-text">
            <EventAdd /> {hasMultipleEvents ? 'All events' : 'Download'} (.ICS)
          </a>

          {allowGoogle && (
            <Link indicateExternal href={googleCalUrl} className="button orange-fill sm small-text">
              Google Calendar
            </Link>
          )}
        </div>

        <p className={css['notice']}>
          <span className="bold small-text">Notice</span>
          <br />
          <span className="tiny-text orange uppercase bold">
            Event information will not be updated once you export the schedule to your personal calendar. PLEASE VISIT
            THE SCHEDULE CLOSER TO EVENT DATE TO MAKE SURE YOUR EVENTS HAVE NOT HAD ANY CHANGES
          </span>
        </p>
      </div>
    </Modal>
  )
}

const Favorite = ({ event, favorites, noContainer }: any) => {
  const [hovered, setHovered] = React.useState(false)
  const isFavorited = favorites.favoriteEvents.some((favoritedEvent: any) => event.ShortID === favoritedEvent)

  const body = (
    <div
      className={css['favorite']}
      onMouseEnter={() => {
        setHovered(true)
      }}
      onMouseLeave={() => {
        setHovered(false)
      }}
      onClick={e => {
        if (favorites.sharedEvents) {
          alert('You are currently viewing a shared schedule. Return to your schedule to edit your favorites.')
        }

        if (isFavorited) {
          favorites.setFavoriteEvents(
            favorites.favoriteEvents.filter((favoriteEvent: any) => favoriteEvent !== event.ShortID)
          )
        } else {
          favorites.setFavoriteEvents(favorites.favoriteEvents.concat(event.ShortID))

          // @ts-ignore
          const matomo = window && window._paq

          if (matomo && !favoritedEventsThisSession.has(event.ID)) {
            matomo.push(['trackEvent', 'Event Favorite Click', `EVENT_ID:${event.ID}`, `EVENT_NAME:${event.Name}`])

            favoritedEventsThisSession.add(event.ID)
          }
        }

        e.stopPropagation()
      }}
    >
      {isFavorited ? <StarFill /> : <StarNormal />}
    </div>
  )

  if (noContainer) {
    return body
  }

  return (
    <div className={`${css['hover-overlay']} ${isFavorited ? css['favorited'] : ''}`}>
      {/* <Tooltip arrow title="Create a custom schedule by favoriting events you are interested in!"> */}
      {body}
      {/* </Tooltip> */}
    </div>
  )
}

const useFavorites = (events: any, edition: Edition): any => {
  const [favoriteEventsLoaded, setFavoriteEventsLoaded] = React.useState(false)
  const [favoriteEvents, setFavoriteEvents] = React.useState<string[]>([])
  const [sharedEvents, setSharedEvents] = React.useState<string[] | null>(null)
  const [sharedTitle, setSharedTitle] = React.useState<string | null>(null)
  const [onlyShowSharedEvents, setOnlyShowSharedEvents] = React.useState(true)
  const [shareTitleInput, setShareTitleInput] = React.useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const share = searchParams.get('share')
  const sharedEdition = searchParams.get('edition')
  const shareTitle = searchParams.get('share_title')
  const storageID = `${edition}_schedule_favorites`

  React.useEffect(() => {
    // Handle legacy shared schedules
    const version = router.query.schedule

    if (version === 'schedule') {
      const fullPath = router.asPath
      const details = fullPath.split('schedule').pop()

      if (sharedEdition === 'istanbul') {
        router.push(`/istanbul${details}`)
      }

      if (sharedEdition === 'amsterdam') {
        router.push(`/amsterdam${details}`)
      }
    }
  }, [router, router.asPath, sharedEdition])

  // Load events from localStorage
  React.useEffect(() => {
    let items = localStorage.getItem(storageID)

    if (items) items = JSON.parse(items)

    if (Array.isArray(items)) {
      setFavoriteEvents(items)
    }

    setFavoriteEventsLoaded(true)
  }, [])

  // If share was defined in the url, enter "shared viewing mode"
  React.useEffect(() => {
    if (share) {
      const ids = JSON.parse(share)

      if (shareTitle) setSharedTitle(shareTitle)
      setSharedEvents(ids)
    }
  }, [share])

  // Whenever favorites change, persist to localStorage
  React.useEffect(() => {
    if (favoriteEventsLoaded) {
      localStorage.setItem(storageID, JSON.stringify(favoriteEvents))
    }
  }, [favoriteEvents, favoriteEventsLoaded])

  const exportFavorites = () => {
    const shareParams = JSON.stringify(favoriteEvents.sort())

    let url = window.location.origin + window.location.pathname

    url += `?edition=${encodeURIComponent(edition)}&share=${encodeURIComponent(shareParams)}`

    if (shareTitleInput) url += `&share_title=${encodeURIComponent(shareTitleInput)}`

    navigator.clipboard.writeText(url)
  }

  const exitSharedMode = () => {
    router.push(window.location.origin + window.location.pathname, undefined, { shallow: true })

    setSharedEvents(null)
  }

  return {
    favoriteEvents: sharedEvents || favoriteEvents,
    setFavoriteEvents,
    sharedEvents,
    sharedTitle,
    onlyShowSharedEvents,
    setOnlyShowSharedEvents,
    setSharedEvents,
    shareTitleInput,
    setShareTitleInput,
    exportFavorites,
    exitSharedMode,
  }
}

// Timeline view (as opposed to list view)
const Timeline = (props: any) => {
  const { min, sortedEvents, events: defaultSortEvents, scheduleDuration, eventsByDay } = props
  const placementTracker = createPlacementTracker()
  const [eventModalOpen, setEventModalOpen] = React.useState('')
  const draggableAttributes = useDraggableLink()
  const router = useRouter()
  // Ref of current active day element (to scroll into view on load)
  const todayRef = React.useRef<any>()

  // React.useEffect(() => {
  //   if (todayRef.current) {
  //     todayRef.current.scrollIntoView({ scrollIntoViewOptions: { inline: 'center' } })
  //   }
  // }, [])

  React.useEffect(() => {
    const path = router.asPath
    const anchor = path.split('#').slice(1).pop()

    if (anchor) {
      const decoded = decodeURI(anchor)

      const el = document.querySelector(`[data-id="${decoded}"]`)

      const selectedEvent = sortedEvents.find((event: any) => event.ShortID === decoded)

      if (!selectedEvent) return

      setEventModalOpen(selectedEvent.ID)

      if (el) {
        var elementPosition = el.getBoundingClientRect().top
        var offsetPosition = elementPosition + window.scrollY - 400

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        })
      }
    }
  }, [])

  // Timeline/default schedule events:
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
    let subtractDays = 0
    // We don't render empty days, so we have to account for that when placing items into our grid - we subtract the empty days prior to the current event, treating them as if they don't exist in the grid
    Array.from(Array(offsetFromFirstEventInSchedule)).forEach((_, index: number) => {
      const emptyDay = !eventsByDay[index]

      if (emptyDay) subtractDays++
    })

    let currentRow = 1 // css property grid-row starts at 1

    /*
        1) Place at first available Y value in the start date column, filling in horizontally if multiple days
        2) If the column Y is already occupied (by another event extending into the day), increase column Y by 1, repeat until free space
          note: Horizontally there will always be room, by definition, because we are filling in left to right 
        3) Keep track of used grid slots along the way (to allow for step 2)
      */
    while (!placementTracker.placeItem(currentRow, offsetFromFirstDay - subtractDays, totalDays)) {
      currentRow++
    }

    const gridPlacement = {
      gridRow: currentRow + 1, // Add 1 to account for the dates occupying the first row
      gridColumn: `${offsetFromFirstDay - subtractDays} / span ${totalDays}`,
      '--eventLength': totalDays,
    }

    return (
      <React.Fragment key={event.Name + offsetFromFirstDay}>
        <div
          className={(() => {
            let className = `${css['event']} ${css[event['Stable ID']]}`

            const isFavorited = props.favorites.favoriteEvents.some(
              (favoritedEvent: any) => event.ShortID === favoritedEvent
            )

            if (props.favorites.sharedEvents && !isFavorited) className += ` ${css['faded']}`

            if (props.edition === 'istanbul') {
              className += ` ${css['domain-based']}`
              if (event['Domain']) className += ` ${css['domain']}`
            }

            if (props.edition === 'amsterdam') {
              className += ` ${css['difficulty-based']} ${css[event['Difficulty']]}`
            }

            if (event.isVirtualEvent) {
              className += ` ${css['virtual-event']}`
            }

            return className
          })()}
          style={gridPlacement}
          {...draggableAttributes}
          onClick={e => {
            if (!e.defaultPrevented) {
              setEventModalOpen(event.ID)
            }
          }}
          data-id={event.ID}
        >
          <div className={css['content']}>
            {event['Stable ID'] === 'Cowork' && (
              <div className={css['image']}>
                {(() => {
                  if (props.edition === 'istanbul') return <DevconnectIstanbul style={{ width: '30px' }} />
                  if (props.edition === 'amsterdam') return <DevconnectAmsterdam style={{ width: '50px' }} />
                })()}
              </div>
            )}
            <div className={css['content-inner']}>
              <div className={css['top']}>
                <div className={css['title-bar']}>
                  <p className={`large-text-em bold ${css['title']} ${totalDays === 1 ? css['single-day'] : ''}`}>
                    {event.Name}{' '}
                    {/* {event.isVirtualEvent && <span style={{ opacity: 0.7, color: 'red' }}>[VIRTUAL EVENT]</span>} */}
                  </p>
                  <Favorite event={event} favorites={props.favorites} />
                </div>

                {event['Time of Day'] && (
                  <div className={css['when']}>
                    {Array.from(Array(totalDays)).map((_, index: number) => {
                      const time = timeOfDayArray[index]
                      const useDayIndicator = !!timeOfDayArray[1] && totalDays > 1
                      const sameTimeEveryDay = shouldRepeatTimeOfDay && totalDays > 1 && time !== 'All day'

                      // if (event['Stable ID'] !== 'Cowork') return null
                      if (!time) return null
                      if (shouldRepeatTimeOfDay && isMultiDayEvent && index > 0) return null

                      return (
                        <div key={index}>
                          <p className="bold">
                            <span className={css['time']}>
                              {time}
                              {sameTimeEveryDay ? ' Every day' : ''}
                            </span>
                            {useDayIndicator && (
                              <>
                                <br />
                                <span className={`${css['which-day']} small-text-em`}>Day {index + 1}</span>
                              </>
                            )}
                          </p>
                          {/* {event['Stable ID'] === 'Cowork' && (
                            <i className="bold">🎉 Social hours 18:00 - 20:00 every day 🎉</i>
                          )} */}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {event['Stable ID'] !== 'Cowork' && (
                <div className={css['bottom']}>
                  <div className={`${css['organizers']} bold`}>
                    {event['Organizer'] ? event['Organizer'] : <p>Organizer</p>}
                  </div>

                  <EventMeta event={event} />
                </div>
              )}
            </div>
          </div>

          <LearnMore
            event={event}
            open={eventModalOpen === event.ID}
            close={() => setEventModalOpen('')}
            edition={props.edition}
            favorites={props.favorites}
          />
        </div>

        {/* {isLastIteration && (
          <div style={{ gridRow: `1 / ${currentRow + 1}`, gridColumn: '1 / 3', background: 'yellow' }}></div>
        )} */}
      </React.Fragment>
    )
  })

  return (
    <>
      <div className={`${css['timeline-background']} clear-vertical`}>
        {props.edition === 'amsterdam' && <ScheduleBackgroundAmsterdam />}

        {props.edition === 'istanbul' && (
          <DevconnectIstanbul style={{ maxWidth: '300px', width: '400px', opacity: 0.15, right: '16px' }} />
        )}
      </div>

      {(() => {
        const selectedEvent = sortedEvents.find((event: any) => event.ID === eventModalOpen)

        if (!selectedEvent) return null

        return (
          <LearnMoreModal
            event={selectedEvent}
            open
            close={() => setEventModalOpen('')}
            edition={props.edition}
            favorites={props.favorites}
          />
        )
      })()}

      <SwipeToScroll noBounds>
        <div className={css['timeline']}>
          {events}

          {Array.from(Array(scheduleDuration)).map((_, index: number) => {
            // const day = moment.utc(defaultSortEvents[0].Date.startDate).add(index, 'days')
            const day = moment.utc(defaultSortEvents[0].Date.startDate).add(index, 'days')
            const weekday = day.format('ddd')
            const date = day.format('MMM DD')
            const noEventsForDay = !eventsByDay[index]
            const now = momentTZ.tz(moment(), 'Europe/Istanbul')
            const dayIsActive = day.isSame(now, 'day')

            if (noEventsForDay) return null

            let className = css['day']

            if (dayIsActive) className += ` ${css['active']}`

            return (
              <div className={className} key={index} ref={dayIsActive ? todayRef : undefined}>
                <p>{dayIsActive ? 'TODAY' : weekday}</p>
                <p>{date}</p>
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
        <div className={`small-text-em`} style={{ display: 'flex', alignItems: 'center' }}>
          <PeopleIcon className={`large-text-em icon`} />
          &nbsp;{props.event['General Size']}
        </div>
      )}

      {props.event.Difficulty && (
        <div className={`small-text-em ${css['difficulty']} ${css[props.event.Difficulty]}`}>
          {props.event.Difficulty}
        </div>
      )}

      <div className={`${css['categories']}`}>
        {props.event['Stream URL'] && (
          <Link href={props.event['Stream URL']}>
            <div className="tag tiny-text-em red">Video</div>
          </Link>
        )}
        {props.event.Category &&
          props.event.Category.length > 0 &&
          props.event.Category.map((category: any) => {
            return (
              <div
                key={category}
                className={`tag tiny-text-em ${category === 'Virtual Event' ? css['is-virtual'] : ''}`}
              >
                {category} {category === 'Virtual Event' && <span className={css['virtual']}>🌐</span>}
              </div>
            )
          })}
      </div>
    </div>
  )
}

const EventLinks = (props: any) => {
  const [calendarModalOpen, setCalendarModalOpen] = React.useState(false)
  const { event } = props

  return (
    <div className={`${css['event-links']} tiny-text uppercase`}>
      {event.URL && event.URL.length > 0 ? (
        <Link href={event.URL} indicateExternal>
          Visit website
        </Link>
      ) : (
        <p>Website coming soon</p>
      )}

      {/* {event['Stable ID'] !== 'Cowork' && <p>Location coming soon</p>} */}

      {event.Location && event.Location.url && (
        <Link href={event.Location.url} indicateExternal>
          Location
        </Link>
      )}

      {event['Stream URL'] && (
        <Link href={event['Stream URL']} indicateExternal className="button xs orange-fill">
          Stream
        </Link>
      )}

      <div className={css['actions']}>
        <>
          <div className={css['add-to-calendar']}>
            <AddToCalendarIcon onClick={() => setCalendarModalOpen(true)} />
          </div>

          <CalendarModal
            calendarModalOpen={calendarModalOpen}
            setCalendarModalOpen={setCalendarModalOpen}
            events={[event]}
            allowGoogle
          />
        </>

        {props.edition === 'istanbul' && <Favorite event={event} favorites={props.favorites} noContainer />}
      </div>
    </div>
  )
}

const LearnMoreModal = (props: { open: boolean; close: () => void; event: any; favorites: any; edition: any }) => {
  return (
    <Modal
      open={props.open}
      close={props.close}
      className={`${css['learn-more-modal']} ${css[`edition-${props.edition}`]}`}
      noCloseIcon
    >
      <div className={css['learn-more-modal-content']}>
        <ListEventMobile
          {...getFormattedEventData(props.event)}
          event={props.event}
          timeline
          edition={props.edition}
          favorites={props.favorites}
        />
      </div>
    </Modal>
  )
}

const LearnMore = (props: { open: boolean; close: () => void; event: any; favorites: any; edition: any }) => {
  let className = css['learn-more']

  return (
    <>
      <div
        className={`${className} ${css[`edition-${props.edition}`]} tiny-text-em bold`}
        style={{ display: 'flex', justifyContent: 'space-between' }}
      >
        <p>Learn More →</p>
        {props.event['Attend'] && <p className={css['attend-details']}>{props.event['Attend']}</p>}
      </div>
    </>
  )
}

const ListTableHeader = () => {
  return (
    <div className={`uppercase bold ${css['list-table-header']} ${css['list-grid']}`}>
      <div className={css['col-1']}>Date & Time</div>
      <div className={css['col-2']}>Event</div>
      <div className={css['col-3']}>Organizers</div>
      <div className={css['col-4']}>Status</div>
    </div>
  )
}

const ListDayHeader = React.forwardRef((props: any, ref: any) => {
  // const [open, setOpen] = React.useState(true)
  const day = props.date.format('dddd')
  const date = props.date.format('MMM DD')
  const now = momentTZ.tz(moment(), 'Europe/Istanbul')
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
          <p className="thin big-text uppercase bold">{dayIsActive ? 'TODAY' : day}</p>
          <p className="thin small-text uppercase bold">{date}</p>
        </div>

        <div className={css['toggle-open']}>{open ? <ChevronUp /> : <ChevronDown />}</div>
      </div>
      {open && props.children}
    </div>
  )
})

ListDayHeader.displayName = 'ListDayHeader'

const ListEventDesktop = (props: any) => {
  const { formattedDate, timeOfDay, isMultiDayEvent, formattedStartDate, formattedEndDate } = props

  return (
    <div
      className={(() => {
        let className = `${css['event-in-table']} ${css[props.event['Stable ID']]}`

        if (props.edition === 'istanbul') {
          className += ` ${css['domain-based']}`
          if (props.event['Domain']) className += ` ${css['domain']}`
        }

        if (props.edition === 'amsterdam') {
          className += ` ${css['difficulty-based']} ${css[props.event['Difficulty']]}`
        }

        if (props.event.isVirtualEvent) {
          className += ` ${css['virtual-event']}`
        }

        return className
      })()}
    >
      <div className={`${css['list-grid']} ${css['content']} `}>
        <div className={`${css['date']} ${css['col-1']}`}>
          <div>
            <p className="bold">
              {formattedDate} — <br /> <span className="small-text">{timeOfDay}</span>
              {/* {props.event['Stable ID'] === 'Cowork' && (
                <>
                  <br />
                  <span className="small-text bold">Social hours 18:00 - 20:00 🎉</span>
                </>
              )} */}
            </p>
            {isMultiDayEvent && (
              <p className={`${css['end-date']} tiny-text bold uppercase`}>
                {formattedStartDate} — {formattedEndDate}
              </p>
            )}
          </div>

          {isMultiDayEvent && (
            <div className={`tag bold purple tiny-text-em ${css['multi-day-indicator']}`}>Multi-day Event</div>
          )}
          {/* {props.event['Stable ID'] === 'Cowork' && (
            <div className={css['cowork-image']}>
              {(() => {
                // if (props.edition === 'amsterdam') return <DevconnectAmsterdam />
                // if (props.edition === 'istanbul') return <DevconnectIstanbul />
              })()}
            </div>
          )} */}
        </div>

        <div className={`${css['description']} ${css['col-2']}`}>
          <div>
            {props.event.URL ? (
              <Link href={props.event.URL} indicateExternal className={`${css['title']} big-text bold uppercase`}>
                {props.event.Name}
              </Link>
            ) : (
              <p className={`${css['title']} big-text bold uppercase`}>{props.event.Name}</p>
            )}

            {props.edition !== 'istanbul' && props.event.Location && props.event.Location.url && (
              <Link
                href={props.event.Location.url}
                indicateExternal
                className={`${css['location']} big-text-bold uppercase`}
              >
                {props.event.Location.text}
              </Link>
            )}

            {props.event['Brief Description'] && (
              <p
                className={`${css['body']} small-text`}
                dangerouslySetInnerHTML={{ __html: htmlDecode(htmlEscape(props.event['Brief Description'])) }}
              />
            )}
          </div>
          <EventMeta event={props.event} />
        </div>

        <div className={`${css['organizers']} ${css['col-3']}`}>
          {props.event['Organizer'] && <p className={`${css['organizers']}`}>{props.event['Organizer']}</p>}
        </div>

        <div className={`${css['attend']} ${css['col-4']}`}>
          {props.event['Attend'] &&
            (props.event['URL'] ? (
              <Link href={props.event.URL} indicateExternal className={`${css['ticket-availability']} small-text`}>
                {props.event['Attend']}
              </Link>
            ) : (
              <p className={`${css['ticket-availability']} small-text`}>{props.event['Attend']}</p>
            ))}
        </div>
      </div>
      <EventLinks {...props} favorites={props.favorites} />
    </div>
  )
}

const ListEventMobile = (props: any) => {
  const { formattedDate, timeOfDay, isMultiDayEvent, formattedStartDate, formattedEndDate } = props

  return (
    <div
      className={(() => {
        let className = `${css['event']} ${css[props.event['Stable ID']]}`

        if (props.edition === 'istanbul') {
          className += ` ${css['domain-based']}`
          if (props.event['Domain']) className += ` ${css['domain']}`
        }

        if (props.edition === 'amsterdam') {
          className += ` ${css['difficulty-based']} ${css[props.event['Difficulty']]}`
        }

        if (props.event.isVirtualEvent) {
          className += ` ${css['virtual-event']}`
        }

        return className
      })()}
    >
      <div className={css['content']}>
        <div className={css['split']}>
          {props.event.URL ? (
            <Link href={props.event.URL} indicateExternal className={`${css['title']} large-text uppercase bold`}>
              {props.event.Name}
            </Link>
          ) : (
            <p className={`${css['title']} large-text uppercase bold`}>{props.event.Name}</p>
          )}

          <div className={css['share-icon']}>
            <CopyToClipboard url={`${window.location.href.split('#')[0]}#${encodeURI(props.event.ShortID)}`} />
          </div>
        </div>

        {props.edition !== 'istanbul' && props.event.Location && props.event.Location.url && (
          <Link
            href={props.event.Location.url}
            indicateExternal
            className={`${css['location']} big-text-bold uppercase`}
          >
            {props.event.Location.text}
          </Link>
        )}

        <div className={css['date']}>
          <p className={`small-text uppercase ${css['time-of-day']}`}>
            {formattedDate} — <br /> <span className="text">{timeOfDay}</span>
            {/* {props.event['Stable ID'] === 'Cowork' && (
              <>
                <br />
                <span className="small-text bold">Social hours 18:00 - 20:00 🎉</span>
              </>
            )} */}
          </p>
          {isMultiDayEvent && (
            <p className={`${css['end-date']} small-text uppercase`}>
              {formattedStartDate} — {formattedEndDate}
            </p>
          )}
        </div>
        {isMultiDayEvent && <div className={`tag purple tiny-text ${css['multi-day-indicator']}`}>Multi-day Event</div>}

        {(() => {
          if (props.event['Stable ID'] !== 'Cowork') return null

          if (props.edition === 'istanbul') return <DevconnectIstanbul style={{ width: '50px', display: 'block' }} />
          if (props.edition === 'amsterdam') return <DevconnectAmsterdam style={{ width: '50px', display: 'block' }} />
        })()}

        {props.event['Brief Description'] && (
          <p
            className={`${css['description']} small-text`}
            dangerouslySetInnerHTML={{ __html: htmlDecode(htmlEscape(props.event['Brief Description'])) }}
          />
        )}

        {props.event['Stable ID'] === 'Easter' && props.timeline && (
          <img src="https://c.tenor.com/thDFJno0zuAAAAAd/happy-easter-easter-bunny.gif" alt="Easter egg" width="100%" />
        )}

        <div className={css['split']}>
          {props.event['Organizer'] && <p className={`uppercase ${css['organizers']}`}>{props.event['Organizer']}</p>}
        </div>
        {props.event['Attend'] &&
          (props.event['URL'] ? (
            <Link
              href={props.event.URL}
              indicateExternal
              className={`${css['ticket-availability']} bold border-top border-bottom small-text uppercase`}
            >
              {props.event['Attend']}
            </Link>
          ) : (
            <p className={`${css['ticket-availability']} bold border-top border-bottom small-text uppercase`}>
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

const ListEvent = (props: any) => {
  const formattedEventData = getFormattedEventData(props.event, props.day)

  return (
    <>
      {/* List view as table (desktop) */}
      <ListEventDesktop
        {...formattedEventData}
        event={props.event}
        edition={props.edition}
        favorites={props.favorites}
      />
      {/* List view (mobile) */}
      <ListEventMobile
        {...formattedEventData}
        event={props.event}
        edition={props.edition}
        favorites={props.favorites}
      />
    </>
  )
}

const List = (props: any) => {
  const { scheduleDuration, eventsByDay, events } = props

  return (
    <div className={css['list']}>
      <ListTableHeader />
      {Array.from(Array(scheduleDuration)).map((_, index: number) => {
        const day = moment.utc(events[0].Date.startDate).add(index, 'days')
        const eventsForDay = eventsByDay[index]

        // Some days within the event range may not have any events
        if (!eventsForDay) return null

        return (
          <ListDayHeader key={index} date={day} ref={el => (props.accordionRefs.current[day.valueOf()] = el)}>
            {eventsForDay.map((event: any, index: number) => {
              return (
                <ListEvent event={event} key={index} day={day} edition={props.edition} favorites={props.favorites} />
              )
            })}
          </ListDayHeader>
        )
      })}
    </div>
  )
}

const useFilter = (events: any, edition: Edition, favorites: any) => {
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false)
  const keysToFilterOn = ['Category', 'Difficulty', 'Attend']
  const [categoryFilter, setCategoryFilter] = React.useState<any>([])
  const [statusFilter, setStatusFilter] = React.useState<any>([])
  const [difficultyFilter, setDifficultyFilter] = React.useState([])
  const filterableValues = {} as { [key: string]: Set<string> }
  const [hideSoldOut, setHideSoldOut] = React.useState(false)
  // Filter out events that aren't ecosystem related:
  const [showOnlyDomainSpecific, setShowOnlyDomainSpecific] = React.useState(false)
  const [showFavorites, setShowFavorites] = React.useState(false)
  const [textSearch, setTextSearch] = React.useState('')

  // // Localstorage sync here
  // React.useEffect(() => {
  //   // localStorage blabla
  //   console.log('filter updated sync localstorage')
  // }, [showFavorites, showOnlyDomainSpecific, hideSoldOut, textSearch])

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

  // const activeFilters = Object.keys(filters)

  const filteredEvents = events.filter((event: any) => {
    if (hideSoldOut && ['sold out', 'applications closed'].includes(event['Attend'] && event['Attend'].toLowerCase())) {
      return false
    }

    if (edition === 'istanbul' && showOnlyDomainSpecific && !event['Domain']) {
      return false
    }

    if (textSearch.length > 0 && !event.Name.toLowerCase().includes(textSearch.toLowerCase())) return false

    if (showFavorites) {
      const eventIsFavorited = favorites.favoriteEvents.some((favoritedEvent: any) => event.ShortID === favoritedEvent)

      if (!eventIsFavorited) return false
    }

    if (difficultyFilter.length > 0) {
      // @ts-ignore
      const difficultyMatch = difficultyFilter.includes(event['Difficulty'])

      if (!difficultyMatch) return false
    }

    if (statusFilter.length > 0) {
      const statusMatch = statusFilter.includes(event['Attend'])

      if (!statusMatch) return false
    }

    if (categoryFilter.length > 0) {
      const categoryMatch = categoryFilter.some((category: any) => event['Category'].includes(category))

      if (!categoryMatch) return false
    }

    return true
  })

  return {
    mobileFilterOpen,
    setMobileFilterOpen,
    filterOpen,
    setFilterOpen,
    events: filteredEvents,
    keysToFilterOn,
    filterableValues,
    hideSoldOut,
    setHideSoldOut,
    showFavorites,
    setShowFavorites,
    showOnlyDomainSpecific,
    setShowOnlyDomainSpecific,
    textSearch,
    setTextSearch,
    difficultyFilter,
    setDifficultyFilter,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    reset: () => {
      setStatusFilter([])
      setDifficultyFilter([])
      setCategoryFilter([])
      setShowOnlyDomainSpecific(false)
      setHideSoldOut(false)
      setShowFavorites(false)
    },
  }
}

const Filter = (props: any) => {
  return (
    <div className={`${css['filter']} small-text`}>
      <div className={css['controls']}>
        <p className="bold small-text">Filter</p>
        <div className="tag sm tiny-text slick-purple" onClick={props.reset}>
          Reset
        </div>
      </div>

      <div className={css['main-filter']}>
        <ListComponent
          className="border-top"
          items={[
            {
              id: '1',
              content: (
                <div className={css['list-toggle-item']}>
                  <p className={css['favorite-filter-highlight']}>
                    <span>Favorites</span>
                    <StarFill />
                  </p>
                  <label className={css['toggle']}>
                    <Toggle
                      checked={props.showFavorites}
                      icons={false}
                      onChange={() => props.setShowFavorites(!props.showFavorites)}
                    />
                  </label>
                </div>
              ),
            },
            {
              id: '2',
              content: (
                <div className={css['list-toggle-item']}>
                  <p>Ecosystem Only</p>
                  <label className={css['toggle']}>
                    <Toggle
                      checked={props.showOnlyDomainSpecific}
                      icons={false}
                      onChange={() => props.setShowOnlyDomainSpecific(!props.showOnlyDomainSpecific)}
                    />
                  </label>
                </div>
              ),
            },
            {
              id: '',
              content: (
                <div className={css['list-toggle-item']}>
                  <p>Hide Sold Out</p>
                  <label className={css['toggle']}>
                    <Toggle
                      icons={false}
                      checked={props.hideSoldOut}
                      onChange={() => props.setHideSoldOut(!props.hideSoldOut)}
                    />
                  </label>
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className={css['experience']}>
        <p className="bold margin-bottom-much-less">Experience</p>
        <div className={css['tags']}>
          {Array.from(props.filterableValues['Difficulty']).map((filterableValue: any) => {
            const isActive = props.difficultyFilter.includes(filterableValue)

            const onChange = () => {
              if (isActive) {
                props.setDifficultyFilter(props.difficultyFilter.filter((filter: any) => filter !== filterableValue))
              } else {
                props.setDifficultyFilter(props.difficultyFilter.concat(filterableValue))
              }
            }
            return (
              <div
                key={filterableValue}
                className={`tag xs tiny-text clickable ${isActive ? 'slick-purple' : ''}`}
                onClick={onChange}
              >
                {filterableValue}
              </div>
            )
          })}
        </div>
      </div>

      <p className="bold">Category</p>

      <div className={css['secondary-filter']}>
        <ListComponent
          className="border-top"
          items={Array.from(props.filterableValues['Category']).map((filterValue: any) => {
            const isChecked = props.categoryFilter.includes(filterValue)

            return {
              id: filterValue,
              content: (
                <label htmlFor={filterValue}>
                  <div className={css['list-toggle-item']}>
                    <p>{filterValue}</p>
                    <input
                      type="checkbox"
                      id={filterValue}
                      checked={isChecked}
                      onChange={e => {
                        if (isChecked) {
                          props.setCategoryFilter(props.categoryFilter.filter((filter: any) => filter !== filterValue))
                        } else {
                          props.setCategoryFilter(props.categoryFilter.concat(filterValue))
                        }
                      }}
                    />
                  </div>
                </label>
              ),
            }
          })}
        />
      </div>

      <p className="bold">Status</p>

      <div className={css['secondary-filter']}>
        <ListComponent
          className="border-top"
          items={Array.from(props.filterableValues['Attend']).map((filterValue: any) => {
            const isChecked = props.statusFilter.includes(filterValue)

            return {
              id: filterValue,
              content: (
                <label htmlFor={filterValue}>
                  <div className={css['list-toggle-item']}>
                    <p>{filterValue}</p>
                    <input
                      type="checkbox"
                      id={filterValue}
                      checked={isChecked}
                      onChange={e => {
                        if (isChecked) {
                          props.setStatusFilter(props.statusFilter.filter((filter: any) => filter !== filterValue))
                        } else {
                          props.setStatusFilter(props.statusFilter.concat(filterValue))
                        }
                      }}
                    />
                  </div>
                </label>
              ),
            }
          })}
        />
      </div>
    </div>
  )
}

const Expand = (props: any) => {
  if (props.scheduleView !== 'list') return null

  return (
    <div className={css['expand-container']}>
      <button
        className={`${css['expand-list']} small-text`}
        onClick={() => Object.values(props.accordionRefs.current).forEach((acc: any) => acc && acc.open && acc.open())}
      >
        <span>
          <ChevronUp />
          <ChevronDown />
        </span>
        <p className="small-text bold">Expand</p>
      </button>
      <button
        className={`${css['expand-list']} small-text`}
        onClick={() =>
          Object.values(props.accordionRefs.current).forEach((acc: any) => acc && acc.close && acc.close())
        }
      >
        <span>
          <ChevronDown />
          <ChevronUp />
        </span>
        <p className="small-text bold">Collapse</p>
      </button>
    </div>
  )
}

// Had to pull this out because nested in conditional and need hooks
const SharingViewActions = (props: any) => {
  const draggableLinkAttributes = useDraggableLink()

  return (
    <SwipeToScroll noBounds scrollIndicatorDirections={{ right: true }}>
      <div className={css['actions']}>
        <button
          className={`${css['exit']} sm wide button purple`}
          onClick={props.favorites.exitSharedMode}
          {...draggableLinkAttributes}
        >
          Return to your schedule <CalendarIcon />
        </button>
        <button
          className="sm wide button slick-purple"
          onClick={() => {
            const yes = confirm(
              'This action will add every event from the current schedule to your local favorites. Proceed?'
            )

            if (yes) {
              const currentFavorites = props.favorites.favoriteEvents
              const sharedFavorites = props.favorites.sharedEvents

              const merged = Array.from(new Set(currentFavorites.concat(sharedFavorites)))

              props.favorites.setFavoriteEvents(merged)

              props.favorites.exitSharedMode()
            }
          }}
          {...draggableLinkAttributes}
        >
          Import To Your Schedule <CalendarPlus />
        </button>
        <button
          className={`sm wide button transparent white ${css['reveal']}`}
          onClick={() => props.favorites.setOnlyShowSharedEvents(!props.favorites.onlyShowSharedEvents)}
          {...draggableLinkAttributes}
        >
          Reveal all events <CalendarMenu />
        </button>
      </div>
    </SwipeToScroll>
  )
}

const scheduleViewHOC = (Component: any) => {
  const ComponentWithScheduleView = (props: any) => {
    const [scheduleView, setScheduleView] = React.useState('timeline')

    useEffect(() => {
      const hash = window.location.hash

      if (hash && hash === '#list') {
        setScheduleView('list')
      }
    }, [])

    return (
      <Component
        {...props}
        // Reset schedule components completely when edition changes - critical for favorites to work correctly
        key={props.edition}
        scheduleView={scheduleView}
        setScheduleView={setScheduleView}
      />
    )
  }

  return ComponentWithScheduleView
}

const Schedule: NextPage = scheduleViewHOC((props: any) => {
  const [openShareModal, setOpenShareModal] = React.useState(false)
  const [calendarModalOpen, setCalendarModalOpen] = React.useState(false)
  const { scheduleView, setScheduleView } = props
  const favorites = useFavorites(props.events, props.edition)

  let {
    events,
    mobileFilterOpen,
    setMobileFilterOpen,
    filterOpen,
    setFilterOpen,
    textSearch,
    setTextSearch,
    ...filterAttributes
  } = useFilter(props.events, props.edition, favorites)

  // Override filters if viewing shared events
  if (favorites.sharedEvents && favorites.onlyShowSharedEvents) {
    events = events.filter((event: any) => favorites.sharedEvents.includes(event.ShortID))
  }

  const scheduleHelpers = useScheduleData(events)
  const accordionRefs = React.useRef({} as { [key: string]: any })

  React.useEffect(() => {
    Object.values(accordionRefs.current).forEach(acc => acc && acc.open && acc.open())
  }, [
    filterAttributes.statusFilter,
    filterAttributes.difficultyFilter,
    filterAttributes.categoryFilter,
    filterAttributes.hideSoldOut,
    filterAttributes.showOnlyDomainSpecific,
    filterAttributes.showFavorites,
    textSearch,
  ])

  React.useEffect(() => {}, [])

  return (
    <>
      <SEO title="Schedule" description="Devconnect schedule" />
      <Hero
        className={`${css['hero']} ${props.edition}`}
        autoHeight
        backgroundTitle={(() => {
          if (props.edition === 'istanbul') return 'Istanbul'
          if (props.edition === 'amsterdam') return 'Amsterdam'
        })()}
      >
        <div className={css['hero-content']}>
          <p className="uppercase extra-large-text bold secondary title">
            {(() => {
              if (props.edition === 'istanbul') return 'Schedule - Istanbul 2023'
              if (props.edition === 'amsterdam') return 'Schedule - Amsterdam 2022'
            })()}
          </p>
          <Link
            href="https://ef-events.notion.site/How-to-organize-an-event-during-Devconnect-4175048066254f48ae85679a35c94022"
            className={`button orange-fill sm margin-top-much-less`}
            indicateExternal
          >
            Host An Event
          </Link>
        </div>
      </Hero>

      {props.edition === 'istanbul' && (
        <div className="section">
          <Alert title="Important" className={`sm ${css['alert']}`}>
            <p className="bold small-text padding-top-less padding-bottom-less">
              👉 Remember, <u>each event during Devconnect is independently hosted</u> and you will require tickets for
              each event you wish to attend. You will find each ticketing information below.
            </p>
          </Alert>
        </div>
      )}

      <div className={`${css['schedule']} ${css[`edition-${props.edition}`]}`}>
        <div className="section">
          {props.edition !== 'istanbul' && <Retro />}
          <div className={css['top-bar-wrapper']}>
            <SwipeToScroll noBounds scrollIndicatorDirections={{ right: true, left: true }}>
              <div className={css['top-bar']}>
                <div className={css['second-row']}>
                  <div className={`${css['view']} small-text`}>
                    <div className={css['options']}>
                      <button
                        className={`${scheduleView === 'timeline' && css['selected']} white button xs`}
                        onClick={() => setScheduleView('timeline')}
                      >
                        <CalendarIcon />
                        <p className={`${css['text']} small-text`}>Timeline</p>
                      </button>
                      <button
                        className={`${scheduleView === 'list' && css['selected']} white button xs`}
                        onClick={() => setScheduleView('list')}
                      >
                        <ListIcon style={{ fontSize: '0.8em' }} />
                        <p className={`${css['text']} small-text`}>List</p>
                      </button>
                    </div>
                  </div>

                  {props.edition === 'amsterdam' && (
                    <div className={css['types']}>
                      <div className={css['all-welcome']}>
                        <p>
                          <span className={css['indicator']}>⬤</span>All welcome
                        </p>
                      </div>
                      <div className={css['intermediate']}>
                        <p>
                          <span className={css['indicator']}>⬤</span>Intermediate
                        </p>
                      </div>
                      <div className={css['advanced']}>
                        <p>
                          <span className={css['indicator']}>⬤</span>Advanced
                        </p>
                      </div>
                    </div>
                  )}

                  {props.edition === 'istanbul' && (
                    <div className={css['types']}>
                      <div className={css['advanced']}>
                        <p>
                          <span className={css['indicator']}>⬤</span>Cowork
                        </p>
                      </div>
                      <div className={css['all-welcome']}>
                        <p>
                          <span className={css['indicator']}>⬤</span>Ecosystem Events
                        </p>
                      </div>
                      <div className={css['virtual']}>
                        <p>
                          <span className={css['indicator']}>⬤</span>Virtual Events
                        </p>
                      </div>
                      <div className={css['intermediate']}>
                        <p>
                          <span className={css['indicator']}>⬤</span>Other Events
                        </p>
                      </div>
                    </div>
                  )}

                  {favorites.sharedEvents === null && (
                    <div>
                      <div
                        className={`slick-purple button wide xs uppercase ${css['share-schedule-cta']}`}
                        onClick={() => setCalendarModalOpen(true)}
                      >
                        <span>
                          Export (.ics)
                          <ScheduleDownloadIcon />
                        </span>
                      </div>

                      <div
                        className={`slick-purple button wide xs ${css['share-schedule-cta']} margin-left-much-less`}
                        onClick={() => setOpenShareModal(true)}
                      >
                        <div>
                          Share Schedule Snapshot <TwirlIcon />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SwipeToScroll>

            <CalendarModal
              calendarModalOpen={calendarModalOpen}
              setCalendarModalOpen={setCalendarModalOpen}
              events={props.events}
              favorites={favorites}
            />

            <Modal open={openShareModal} close={() => setOpenShareModal(!openShareModal)} noCloseIcon>
              <div className={css['share-schedule-modal']} draggable="false">
                <div className={css['modal-header']}>
                  <Image src={ShareModalImage} alt="Twirl graphic" quality={100} />
                  <div className={css['content']}>
                    <p className={css['meta']}>Share snapshot</p>
                    <p className="bold uppercase">Name your Devconnect Snapshot</p>

                    <div className={css['standard-input']}>
                      <input
                        type="text"
                        value={favorites.shareTitleInput}
                        onChange={e => favorites.setShareTitleInput(e.target.value)}
                        placeholder="Name"
                      />
                      <SearchIcon />
                    </div>
                  </div>
                </div>

                <div className={css['description']}>
                  <p className="bold margin-bottom-much-less">Share a snapshot of your personal schedule</p>
                  <p className="small-text">
                    Create a shareable link of your favorited events on this device to share with others, or to
                    view/import on another device.
                  </p>
                </div>

                <div className={css['action']}>
                  <p className="bold small-text">What others will see</p>
                  <p className={`${css['preview']}`}>
                    You are currently viewing{' '}
                    <span className="orange bold underline">{favorites.shareTitleInput || 'a shared schedule'}</span>
                    &nbsp;snapshot.
                  </p>

                  <CopyToClipboard>
                    <button className={`button orange-fill sm`} onClick={favorites.exportFavorites}>
                      <span>Share Your Schedule</span>
                      <TwirlIcon />
                    </button>
                  </CopyToClipboard>
                </div>

                <p className={css['notice']}>
                  <span className="bold small-text">Notice</span>
                  <br />
                  <span className="tiny-text orange uppercase bold">
                    This will be a snapshot of your currently favorited events on this device. Any subsequent updates to
                    your favorites won&apos;t change the snapshot shared.
                  </span>
                </p>
              </div>
            </Modal>
          </div>

          <div className={css['first-row-above-schedule']}>
            <div className={css['filter-toggle']}>
              <button className={filterOpen ? css['active'] : ''} onClick={() => setFilterOpen(!filterOpen)}>
                <FilterIcon />
              </button>

              <div className={css['active-filters']}>
                <p className="small-text">Current filter:</p>
                <p className="bold tiny-text">
                  {(() => {
                    const {
                      categoryFilter,
                      difficultyFilter,
                      statusFilter,
                      hideSoldOut,
                      showFavorites,
                      showOnlyDomainSpecific,
                    } = filterAttributes

                    const computeFilterShorthand = (key: string, filters: string[]) => {
                      if (filters.length === 0) return
                      if (filters.length === 1) return filters[0]

                      return `${key} (${filters.length})`
                    }

                    return (
                      [
                        computeFilterShorthand('Categories', categoryFilter),
                        computeFilterShorthand('Experience', difficultyFilter),
                        showFavorites ? 'Favorites' : null,
                        computeFilterShorthand('Status', statusFilter),
                        hideSoldOut ? 'Not sold out' : null,
                        ,
                        showOnlyDomainSpecific ? 'Ecosystem' : null,
                        ,
                      ]
                        .filter(val => !!val)
                        .join(', ') || 'None'
                    )
                  })()}
                </p>
              </div>
            </div>
            <div className={css['text-search-wrapper']}>
              <div className={css['text-search']}>
                <input value={textSearch} onChange={e => setTextSearch(e.target.value)} placeholder="Find an Event" />
                <SearchIcon />
              </div>
            </div>
            {scheduleView === 'timeline' && (
              <p className={`small-text bold uppercase ${css['swipe']}`}>Hold and drag schedule for more →</p>
            )}

            {/* <Expand scheduleView={scheduleView} accordionRefs={accordionRefs} /> */}
          </div>

          <div className={`${css['schedule-wrapper']} ${scheduleView === 'timeline' ? css['timeline-wrapper'] : ''}`}>
            {filterOpen && (
              <>
                <div className={css['filter-foldout']}>
                  <Filter events={events} {...filterAttributes} edition={props.edition} favorites={favorites} />
                </div>
                <div className={css['fade']} />
              </>
            )}

            {events.length === 0 ? (
              <div className={css['no-results']}>
                <Image src={FilterMiss} alt="Guy unable to find an Ethereum artifact" />
                <p className="bold large-text margin-top-much-less margin-bottom">
                  There are no events matching this filter! Try something else!
                </p>
              </div>
            ) : (
              <>
                {scheduleView === 'list' && (
                  <List
                    {...scheduleHelpers}
                    edition={props.edition}
                    accordionRefs={accordionRefs}
                    favorites={favorites}
                  />
                )}
                {scheduleView === 'timeline' && (
                  <div>
                    <Timeline {...scheduleHelpers} favorites={favorites} edition={props.edition} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="margin-top" />
        {/* <div className="section margin-top">
          {props.edition === 'istanbul' && (
            <div className={css['organize-cta']}>
              <Link
                href="https://ef-events.notion.site/How-to-organize-an-event-during-Devconnect-4175048066254f48ae85679a35c94022"
                className={`button white sm`}
                indicateExternal
              >
                Add your own event
              </Link>
              <p>
                Devconnect events are independently organized by the Ethereum community;{' '}
                <b>if you have a great idea for an event, we encourage you to apply using the button above!</b>
              </p>
            </div>
          )}
        </div> */}

        {favorites.sharedEvents && (
          <div className={css['shared-schedule-overlay']}>
            <div className="section">
              <div className={css['info-box']}>
                <div className={css['left']}>
                  <DevconnectIstanbulText />
                  <div className={css['snapshot-meta']}>
                    Schedule
                    <br />
                    <span>Snapshot</span>
                    <br />
                    <TwirlIcon />
                    <br />
                  </div>
                  <div className={css['currently-viewing']}>
                    <div className={css['divider']}></div>
                    <p className={css['text']}>
                      You are currently viewing{' '}
                      <span className={css['info-icon']}>
                        {/* 
                        //@ts-ignore */}
                        <Tooltip
                          arrow
                          title="This schedule was created by another user. You can create your own snapshot by favoriting events and creating a snapshot url."
                        >
                          <InfoIcon />
                        </Tooltip>
                      </span>
                    </p>
                    <p className={css['snapshot-title']}>
                      <span className="orange">{favorites.sharedTitle || 'a shared schedule'}</span> snapshot
                    </p>
                  </div>
                  {/* <p className="large-text bold">You are viewing {favorites.sharedTitle || 'a shared schedule'}</p> */}
                </div>
                <SharingViewActions favorites={favorites} />
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
})

export default Schedule

// Notion fetch/format below
const notionDatabasePropertyResolver = (property: any, key: any) => {
  switch (property.type) {
    case 'text':
    case 'rich_text':
    case 'title':
      // Extract url and url text from the Location column
      if (key === 'Location' && property[property.type]) {
        let locationInfo = {} as any

        property[property.type].forEach((chunk: any) => {
          if (chunk.href) {
            locationInfo.url = chunk.href
            locationInfo.text = chunk.plain_text
          }
        })

        return locationInfo
      }

      const dechunked = property[property.type]
        ? property[property.type].reduce((acc: string, chunk: any) => {
            let textToAppend

            if (chunk.href && property.type === 'rich_text' && key !== 'URL' && key !== 'Stream URL') {
              textToAppend = `<a href=${chunk.href} target="_blank" class="generic" rel="noopener noreferrer">${chunk.plain_text}</a>`
            } else {
              textToAppend = chunk.plain_text
            }

            if (chunk.annotations) {
              let annotations = 'placeholder'

              if (chunk.annotations.bold) annotations = `<b>${annotations}</b>`
              if (chunk.annotations.italic) annotations = `<i>${annotations}</i>`
              if (chunk.annotations.strikethrough) annotations = `<s>${annotations}</s>`
              if (chunk.annotations.underline) annotations = `<u>${annotations}</u>`

              textToAppend = annotations.replace('placeholder', textToAppend)
            }

            return acc + textToAppend
          }, '')
        : null

      return `${dechunked}`

    case 'date':
      if (property.date) {
        return {
          startDate: property.date.start,
          endDate: property.date.end || property.date.start,
        }
      }

      return null

    case 'multi_select':
      if (property.multi_select) {
        return property.multi_select.map((value: any) => value.name)
      }

      return null
    case 'select':
      return property.select && property.select.name

    case 'number':
      return property.number

    case 'checkbox':
      return property.checkbox

    default:
      return 'default value no handler for: ' + property.type
  }
}

const formatResult = (result: any) => {
  const properties = {} as { [key: string]: any }

  // Our schedules follow multiple formats, so we have to normalize before processing:
  const normalizedNotionEventData = normalizeEvent(result.properties)

  // Format the raw notion data into something more workable
  Object.entries(normalizedNotionEventData).forEach(([key, value]) => {
    if (typeof value === 'undefined') return

    const val = notionDatabasePropertyResolver(value, key)

    if (Array.isArray(val)) {
      properties[key] = val
    } else if (typeof val === 'object' && val !== null) {
      properties[key] = {
        ...val,
      }
    } else {
      properties[key] = val
    }
  })

  // Insert a default value for time of day when unspecified
  if (!properties['Time of Day']) properties['Time of Day'] = 'All day'
  // Prepend https to url if it's not an internal link (e.g. /cowork) and if https is not specified in case the event host forgot
  if (properties['URL']) {
    const isInternal = properties['URL'].startsWith('/')
    const noHttp = !properties['URL'].startsWith('http')

    if (noHttp && !isInternal) {
      properties['URL'] = `https://${properties['URL']}`
    }
  }

  const isVirtualEvent = properties.Category && properties.Category.includes('Virtual Event')

  return { ...properties, isVirtualEvent, ID: result.id, ShortID: result.id.slice(0, 5) /* raw: result*/ }
}

export async function getStaticProps(context: any) {
  const notion = new Client({
    auth: process.env.NOTION_SECRET,
  })

  let data = {}

  const istanbulQuery = {
    database_id: '949b9d7e7fc74986b7ce03580bd4c65b',
    sorts: [
      {
        property: '[HOST] Event Date',
        direction: 'ascending',
      },
      {
        property: '[WEB] Priority (sort)',
        direction: 'descending',
      },
    ],
    filter: {
      and: [
        {
          property: '[HOST] Event Date',
          date: {
            is_not_empty: true,
          },
        },
        {
          property: '[WEB] Live',
          checkbox: {
            equals: true,
          },
        },
      ],
    },
  }

  const amsterdamQuery = {
    database_id: '8b177855e75b4964bb9f3622437f04f5',
    sorts: [
      {
        property: 'Date',
        direction: 'ascending',
      },
      {
        property: 'Priority (sort)',
        direction: 'descending',
      },
    ],
    filter: {
      and: [
        {
          property: 'Date',
          date: {
            is_not_empty: true,
          },
        },
        {
          property: 'Live',
          checkbox: {
            equals: true,
          },
        },
      ],
    },
  }

  let path = context.params.schedule

  if (path === 'schedule') path = 'istanbul'

  const query = (() => {
    if (path === 'amsterdam') return amsterdamQuery
    if (path === 'istanbul') return istanbulQuery

    throw 'no database provided'
  })()

  try {
    // Notion returns up to 100 results per request. We won't have that many events, but if we ever get close, add support for pagination at this step.
    const response = await notion.databases.query(query as any)

    data = response.results.map(formatResult)
  } catch (error) {
    if (false) {
      // Handle error codes here if necessary
    } else {
      // Other error handling code
      console.error(error)
    }
  }

  return {
    props: {
      events: data,
      edition: path,
    },
    revalidate: 1 * 60 * 30, // 30 minutes, in seconds
  }
}

export const getStaticPaths = async () => {
  return {
    paths: [
      { params: { schedule: 'schedule' } },
      { params: { schedule: 'amsterdam' } },
      { params: { schedule: 'istanbul' } },
    ],
    fallback: false,
  }
}

/*
  Notion data normalization stuff below...
*/
const createKeyResolver =
  (eventData: any) =>
  (...candidateKeys: string[]) => {
    const keyMatch = candidateKeys.find(key => {
      return typeof eventData[key] !== 'undefined'
    })

    return keyMatch ? eventData[keyMatch] : undefined
  }

// The notion tables for each edition (istanbul, amsterdam, etc.) aren't the same - this normalizes the different column names by looking at multiple keys for each expected value
const normalizeEvent = (eventData: any): FormattedNotionEvent => {
  const keyResolver = createKeyResolver(eventData)

  return {
    ID: keyResolver('ID', 'id'),
    'Stable ID': keyResolver('Stable ID', '[WEB] Stable ID'),
    Name: keyResolver('Name'),
    Organizer: keyResolver('Organizer', '[HOST] Organizer'),
    URL: keyResolver('URL', '[HOST] Event Website URL'),
    'Stream URL': keyResolver('Stream URL', '[WEB] Stream URL'),
    Date: keyResolver('Date', '[HOST] Event Date'),
    Live: keyResolver('Live', '[WEB] Live'),
    Attend: keyResolver('Attend', '[HOST] Status'),
    'Brief Description': keyResolver('Brief Description', '[HOST] Description (280 chars, tweet size)'),
    'Time of Day': keyResolver('Time of Day', '[HOST] Event Hours'),
    Category: keyResolver('Category', '[HOST] Category'),
    'General Size': keyResolver('Num. of Attendees', '[HOST] Num. of Attendees'),
    Difficulty: keyResolver('Difficulty', '[HOST] Difficulty'),
    Location: keyResolver('Location', '[HOST] Location'),
    Domain: keyResolver('[INT] Domain'),
    Priority: keyResolver('[WEB] Priority (sort)', 'Priority (sort)'),
  }
}

type FormattedNotionEvent = {
  ID: any
  'Stable ID'?: any
  Name?: any
  Organizer?: any[]
  URL?: any
  'Stream URL'?: any
  Date?: any
  Location?: any
  Live?: any
  Attend?: any
  'Brief Description'?: any
  'Time of Day'?: any
  Category?: any
  'General Size'?: any
  Difficulty?: any
  Domain: any
  Priority: any
}

type Edition = 'istanbul' | 'amsterdam'
