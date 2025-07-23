import React, { useState } from 'react'
import moment from 'moment'
import { Table, TableColumn } from 'lib/components/table/Table'
import { SortVariation } from 'lib/components/sort'
import Link from 'common/components/link'
import RichText from 'lib/components/tina-cms/RichText'
import styles from './event-table.module.scss'

function formatHumanReadableDate(startDate: string, endDate: string) {
  const start = moment.utc(startDate)
  const end = moment.utc(endDate)

  if (!start.isValid() && !end.isValid()) {
    return ''
  }

  if (start.isSame(end)) {
    // If start and end date are the same, format as "Feb 3, 2024"
    return start.format('MMM D, YYYY')
  } else {
    // If the start and end year are the same, include the year at the end.
    // Format as "Feb 3 - March 5, 2024" or include the year in both dates if they are different
    if (start.year() === end.year()) {
      return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`
    } else {
      return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`
    }
  }
}

function formatEventUrl(name: string, eventId: string): string {
  // Convert to lowercase and replace spaces with hyphens
  const formattedName = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    // Remove special characters but keep hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple consecutive hyphens with a single one
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '')

  return `/destino/${formattedName}-${eventId}`
}

const tableColumns: Array<TableColumn> = [
  {
    title: 'Date',
    key: 'Date',
    sort: (a: any, b: any) => {
      const { date: startDate1 } = a
      const { date: startDate2 } = b

      const start1 = moment.utc(startDate1)
      const start2 = moment.utc(startDate2)

      if (a.eventHasPassed && !b.eventHasPassed) {
        return 1
      } else if (b.eventHasPassed && !a.eventHasPassed) {
        return -1
      }

      if (start1.isAfter(start2)) {
        if (a.eventHasPassed && b.eventHasPassed) return -1
        return 1
      } else if (start1.isBefore(start2)) {
        if (a.eventHasPassed && b.eventHasPassed) return 1
        return -1
      }

      return 0
    },
    render: item => {
      if (item && item.name && item.name.includes('SUCURSAL')) {
        console.log(item, 'ITEM')
        console.log(item.date, 'DATE')
        console.log(formatHumanReadableDate(item.date, item.date), 'FORMATTED DATE')
      }

      return (
        <p className={`bolda ${item.eventHasPassed ? 'opacity-40' : ''}`}>
          {formatHumanReadableDate(item.date, item.date)}
        </p>
      )
    },
  },
  {
    title: 'Name',
    key: 'Name',
    sort: SortVariation.basic,
    render: item => {
      return <p className={`bolda ${item.eventHasPassed ? 'opacity-40' : ''}`}>{item.name}</p>
    },
  },
  {
    title: 'Location',
    key: 'Location',
    className: '!hidden md:!flex',
    sort: SortVariation.basic,
    render: item => {
      if (!item.location) return null

      if (item.location) {
        return <p className={`bolda ${item.eventHasPassed ? 'opacity-40' : ''}`}>{item.location}</p>
      }

      return <p className={`bolda ${item.eventHasPassed ? 'opacity-40' : ''}`}>{item.location}</p>
    },
  },
  {
    title: 'Type of Event',
    key: 'Type of Event',
    className: '!hidden md:!flex',
    sort: SortVariation.basic,
    render: item => {
      return <p className={`bolda ${item.eventHasPassed ? 'opacity-40' : ''}`}>{item.type_of_event}</p>
    },
  },
  {
    title: 'Social',
    key: 'Social',
    className: '!hidden lg:!flex',
    render: item => {
      if (!item.twitter_handle) return null

      let socialFormatted = item.twitter_handle

      if (socialFormatted.startsWith('@')) {
        socialFormatted = socialFormatted.slice(1)
      }

      return (
        <Link
          className={`bolda ${item.eventHasPassed ? 'opacity-40' : ''}`}
          href={`https://x.com/${socialFormatted}`}
          indicateExternal
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            e.preventDefault()
            window.open(`https://x.com/${socialFormatted}`, '_blank')
          }}
        >
          {socialFormatted}
        </Link>
      )
    },
  },
]

const EventsTable = React.memo(({ events, pages }: any) => {
  const [includePastEvents, setIncludePastEvents] = React.useState(true)
  const [search, setSearch] = React.useState('')

  const formattedEvents = events.map((event: any) => {
    const end = moment.utc(event.date).add(1, 'days')
    const now = moment.utc()

    const eventHasPassed = now.isAfter(end)

    return {
      ...event,
      _key: event.Name + event.Location,
      eventHasPassed,
      href: formatEventUrl(event.name, event.event_id),
    }
  })

  const filteredEvents = formattedEvents.filter((event: any) => {
    if (!includePastEvents && event.eventHasPassed) {
      return false
    }

    if (search.length > 0) {
      const searchableKeys = {
        name: event.name,
        location: event.location,
        type_of_event: event.type_of_event,
        twitter_handle: event.twitter_handle,
      }

      return Object.keys(searchableKeys).some(key => {
        const value = event[key]
        return typeof value === 'string' && value.toLowerCase().includes(search.toLowerCase())
      })
    }

    return true
  })

  const rowWrapper = (row: any, children: React.ReactNode) => (
    <Link href={row.href} className={styles['row-link']}>
      {children}
    </Link>
  )

  return (
    <div className={`w-full ${styles['event-table']}`}>
      <div className="flex justify-between items-center mb-4 gap-2">
        {/* <div className="font-bold">Destino Devconnect Events</div> */}

        <div className="flex">
          <p
            className={`no-select cursor-pointer px-2 py-2 ${!includePastEvents ? styles['selected-filter'] : ''}`}
            onClick={() => {
              setIncludePastEvents(false)
            }}
            data-text="Upcoming Events"
          >
            Upcoming Events
          </p>

          <p
            className={`no-select cursor-pointer px-2 py-2 ${includePastEvents ? styles['selected-filter'] : ''}`}
            onClick={() => {
              setIncludePastEvents(!includePastEvents)
            }}
            data-text="All Events"
          >
            All Events
          </p>
        </div>

        <input
          className={`p-1.5 text-base lg:text-sm px-3 border-solid text-black outline-none`}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Events"
        />
      </div>

      <div className="mb-4">{/* <RichText content={pages.events_table}></RichText> */}</div>

      <div className="text-sm overflow-hidden text-white">
        <Table itemKey="_key" items={filteredEvents} columns={tableColumns} initialSort={0} rowWrapper={rowWrapper} />
      </div>
    </div>
  )
})

export { EventsTable }
