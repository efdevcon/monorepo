import React from 'react'
import { PenLine } from 'lucide-react'
import { Event as EventType } from '../model'
import { format, parseISO } from 'date-fns'

type EventProps = {
  event: EventType
}

const Event: React.FC<EventProps> = ({ event }) => {
  // Get the first timeblock for display
  const timeblock = event.timeblocks[0]

  // Format the start and end times
  const formatTime = (isoString: string) => {
    return format(parseISO(isoString), 'h:mm a')
  }

  const startTime = formatTime(timeblock.start)
  const endTime = formatTime(timeblock.end)
  const duration = `${startTime} - ${endTime}`

  // Determine CSS class based on difficulty
  const difficultyClass =
    event.difficulty === 'Beginner'
      ? 'bg-green-300'
      : event.difficulty === 'Intermediate'
      ? 'bg-yellow-300'
      : 'bg-red-300'

  return (
    <div className="flex flex-col gap-4 border border-solid border-neutral-200 p-2 px-2 shrink-0 max-w-[300px] relative rounded-lg">
      <div className="flex h-full">
        <div className="flex flex-col mr-4 items-center">
          <div className="text-[10px]">{startTime}</div>
          <div className="min-h-[10px] grow border-solid border-l border-l-neutral-400 self-center my-1"></div>
          <div className="text-[10px]">{endTime}</div>
        </div>
        <div className="flex flex-col grow justify-between items-stretch">
          <div className="text-xs font-medium line-clamp-2">{event.name}</div>
          <div className="text-xs text-gray-600 mt-1">{event.location.text}</div>
          <div className="flex gap-2 justify-end mt-2">
            <div className={`text-xs rounded text-[10px] ${difficultyClass} px-2 py-0.5 flex gap-1.5 items-center`}>
              {event.difficulty}
            </div>
            <div className="text-xs rounded text-[10px] bg-blue-300 px-2 py-0.5 flex gap-1.5 items-center">
              <PenLine className="" size={11} />
              RSVP
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Event
