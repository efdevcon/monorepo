import React, { useState } from 'react'
import moment from 'moment'
import { Table, TableColumn } from 'lib/components/table/Table'
import { SortVariation } from 'lib/components/sort'
import Link from 'common/components/link'
import RichText from 'lib/components/tina-cms/RichText'
import styles from './event-table.module.scss'

function formatHumanReadableDate(startDate: string, endDate: string) {
  const start = moment(startDate)
  const end = moment(endDate)

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

const tableColumns: Array<TableColumn> = [
  {
    title: 'Date',
    key: 'Date',
    sort: (a: any, b: any) => {
      const { startDate: startDate1 } = a
      const { startDate: startDate2 } = b

      const start1 = moment(startDate1)
      const start2 = moment(startDate2)

      // if (a.eventHasPassed && !b.eventHasPassed) {
      //   return 1
      // } else if (b.eventHasPassed && !a.eventHasPassed) {
      //   return -1
      // }

      if (start1.isAfter(start2)) {
        // if (a.eventHasPassed && b.eventHasPassed) return -1
        return 1
      } else if (start1.isBefore(start2)) {
        // if (a.eventHasPassed && b.eventHasPassed) return 1
        return -1
      }

      return 0
    },
    render: item => {
      return (
        <p className={`bolda ${item.eventHasPassed ? 'opacity-40' : ''}`}>
          {formatHumanReadableDate(item.Date.startDate, item.Date.endDate)}
        </p>
      )
    },
  },
  {
    title: 'Name',
    key: 'Name',
    sort: SortVariation.basic,
    render: item => {
      if (item.Link) {
        return (
          <Link className="bold" href={item.Link} indicateExternal>
            {item.Name}
          </Link>
        )
      }

      return <p className={`bold`}>{item.Name}</p>
    },
  },
  {
    title: 'Location',
    key: 'Location',
    className: '!hidden md:!flex',
    sort: SortVariation.basic,
    render: item => {
      if (!item.Location) return null

      if (item.Location.text) {
        return <p className="bolda">{item.Location.text}</p>
      }

      return <p className="bolda">{item.Location}</p>
    },
  },
  {
    title: 'Type of Event',
    key: 'Type of Event',
    className: '!hidden md:!flex',
    sort: SortVariation.basic,
    render: item => {
      return <p className="bolda">{item['Type of Event']}</p>
    },
  },
  {
    title: 'Team',
    key: 'Team',
    sort: SortVariation.basic,
    className: '!hidden md:!flex',
    render: item => {
      return <p className={`${styles['team-col']}`}>{item.Team}</p>
    },
  },
  {
    title: 'Social',
    key: 'Social',
    className: '!hidden lg:!flex',
    // sort: SortVariation.basic,
    render: item => {
      if (!item.Social) return null

      return (
        <Link className="bolda" href={item.Social} indicateExternal>
          {item.Social}
        </Link>
      )
    },
  },
]

const EventsTable = React.memo(({ events, pages }: any) => {
  const [includePastEvents, setIncludePastEvents] = React.useState(true)
  const [search, setSearch] = React.useState('')

  const formattedEvents = events.map((event: any) => {
    const end = moment(event.Date.endDate).add(1, 'days')
    const now = moment()

    const eventHasPassed = now.isAfter(end)

    return {
      ...event,
      _key: event.Name + event.Location,
      eventHasPassed,
    }
  })

  const filteredEvents = formattedEvents.filter((event: any) => {
    if (!includePastEvents && event.eventHasPassed) {
      return false
    }

    if (search.length > 0) {
      return Object.keys(event).some(key => {
        const value = event[key]
        return typeof value === 'string' && value.toLowerCase().includes(search.toLowerCase())
      })
    }

    return true
  })

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4 gap-2">
        <div className="font-bold">Destino Devconnect Events</div>

        <div className="flex">
          <p
            className={`no-select cursor-pointer translate-y-[1px] hover:font-bold px-2 md:px-4 py-2 ${
              !includePastEvents ? 'font-bold' : ''
            }`}
            onClick={() => {
              setIncludePastEvents(false)
            }}
          >
            Upcoming Events
          </p>

          <p
            className={`no-select cursor-pointer translate-y-[1px] hover:font-bold px-2 md:px-4 py-2 ${
              includePastEvents ? 'font-bold' : ''
            }`}
            onClick={() => {
              setIncludePastEvents(!includePastEvents)
            }}
          >
            All Events
          </p>
        </div>

        <input
          className={`rounded-lg p-1.5 text-base lg:text-sm px-4 border-solid text-black border border-slate-300 outline-none`}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Events"
        />
      </div>

      <div className="mb-4">{/* <RichText content={pages.events_table}></RichText> */}</div>

      <div className="text-sm text-black rounded-xl overflow-hidden">
        <Table itemKey="_key" items={filteredEvents} columns={tableColumns} initialSort={0} />
      </div>
    </div>
  )
})

export { EventsTable }
