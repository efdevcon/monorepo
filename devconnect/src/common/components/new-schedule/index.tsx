import React, { useState } from 'react'
import { Event } from './model'
import { dummyEvents } from './dummy-data'

const NewSchedule = () => {
  const [events] = useState<Event[]>(
    dummyEvents.sort((a, b) => {
      // Sort by earliest timeblock start first
      const aEarliestStart = new Date(a.timeblocks[0]?.start || '').getTime()
      const bEarliestStart = new Date(b.timeblocks[0]?.start || '').getTime()

      if (aEarliestStart !== bEarliestStart) return aEarliestStart - bEarliestStart

      // If earliest starts are the same, sort by latest timeblock end
      const aLatestEnd = a.timeblocks.reduce((latest, block) => {
        const end = new Date(block.end).getTime()
        return end > latest ? end : latest
      }, 0)

      const bLatestEnd = b.timeblocks.reduce((latest, block) => {
        const end = new Date(block.end).getTime()
        return end > latest ? end : latest
      }, 0)

      return aLatestEnd - bLatestEnd
    })
  )

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  // Format date and time from ISO string
  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Get the date range for an event
  const getEventDateRange = (event: Event) => {
    if (!event.timeblocks.length) return 'No dates available'

    const startDates = event.timeblocks.map(block => new Date(block.start))
    const endDates = event.timeblocks.map(block => new Date(block.end))

    const earliestDate = new Date(Math.min(...startDates.map(d => d.getTime())))
    const latestDate = new Date(Math.max(...endDates.map(d => d.getTime())))

    if (earliestDate.toDateString() === latestDate.toDateString()) {
      return formatDate(earliestDate.toISOString())
    } else {
      return `${formatDate(earliestDate.toISOString())} - ${formatDate(latestDate.toISOString())}`
    }
  }

  // Check if event is full (simplified logic - assuming amountPeople is capacity)
  const isEventFull = (event: Event) => {
    // This is a placeholder - in a real app, you'd compare registered users to capacity
    return parseInt(event.amountPeople) <= 20 // Just for demo purposes
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Event Schedule</h1>

      {/* Grid Layout for Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {events.map(event => (
          <div
            key={event.id}
            className="border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedEvent(event)}
          >
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium">{event.name}</h3>
                <span
                  className={`px-2 py-1 text-sm rounded ${
                    event.difficulty === 'Beginner'
                      ? 'bg-green-100 text-green-800'
                      : event.difficulty === 'Intermediate'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {event.difficulty}
                </span>
              </div>

              <div className="mt-2 text-gray-600">
                <p>{getEventDateRange(event)}</p>
                {event.timeblocks.length > 0 && (
                  <p>
                    {formatTime(event.timeblocks[0].start)} - {formatTime(event.timeblocks[0].end)}
                    {event.timeblocks.length > 1 && ' (+ more times)'}
                  </p>
                )}
                <p className="mt-1">{event.location.text}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {event.categories.slice(0, 2).map(category => (
                  <span key={category} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {category}
                  </span>
                ))}
                {event.categories.length > 2 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">
                    +{event.categories.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold">{selectedEvent.name}</h2>
                <button onClick={() => setSelectedEvent(null)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-700">
                    <strong>Date Range:</strong> {getEventDateRange(selectedEvent)}
                  </p>

                  {selectedEvent.timeblocks.length > 0 && (
                    <div className="mt-2">
                      <p className="text-gray-700">
                        <strong>Schedule:</strong>
                      </p>
                      <ul className="mt-1 space-y-1">
                        {selectedEvent.timeblocks.map((block, index) => (
                          <li key={index} className="text-gray-600">
                            {formatDate(block.start)}: {formatTime(block.start)} - {formatTime(block.end)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="mt-2 text-gray-700">
                    <strong>Location:</strong> {selectedEvent.location.text}
                  </p>
                  <p className="text-gray-700">
                    <strong>Organizer:</strong> {selectedEvent.organizer}
                  </p>
                  <p className="text-gray-700">
                    <strong>Capacity:</strong> {selectedEvent.amountPeople} people
                  </p>
                  <p className="text-gray-700">
                    <strong>Difficulty:</strong> {selectedEvent.difficulty}
                  </p>
                </div>

                <div>
                  <p className="text-gray-700">
                    <strong>Description:</strong>
                  </p>
                  <p className="mt-1">{selectedEvent.description}</p>

                  <div className="mt-4">
                    <p className="text-gray-700">
                      <strong>Categories:</strong>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedEvent.categories.map(category => (
                        <span key={category} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                {!isEventFull(selectedEvent) && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                    RSVP to Event
                  </button>
                )}
                {isEventFull(selectedEvent) && (
                  <span className="px-4 py-2 bg-gray-200 text-gray-700 rounded">Event Full</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewSchedule
