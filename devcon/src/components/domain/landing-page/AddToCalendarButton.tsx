import React, { useState, useRef, useEffect } from 'react'
import { CalendarPlus, X } from 'lucide-react'

export interface CalendarEventSpec {
  title: string
  description: string
  location?: string
  // All-day range (YYYY-MM-DD, exclusive end date) for multi-day events…
  startDate?: string
  endDate?: string
  // …or exact UTC instants for timed events (take precedence when set).
  start?: Date
  end?: Date
  filename?: string
}

const DEVCON_EVENT: CalendarEventSpec = {
  title: 'Devcon 8',
  location: 'Jio World Centre, Mumbai, India',
  startDate: '2026-11-03',
  endDate: '2026-11-07', // exclusive end date for all-day events
  description: 'Devcon is the Ethereum conference for developers, thinkers, and makers. https://devcon.org',
  filename: 'devcon-8.ics',
}

// "2026-07-14T16:00:00.000Z" → "20260714T160000Z" (ICS / Google UTC instant)
function toCalendarInstant(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function formatDates(event: CalendarEventSpec): { start: string; end: string; allDay: boolean } {
  if (event.start && event.end) {
    return { start: toCalendarInstant(event.start), end: toCalendarInstant(event.end), allDay: false }
  }
  return { start: event.startDate!.replace(/-/g, ''), end: event.endDate!.replace(/-/g, ''), allDay: true }
}

function getGoogleCalendarUrl(event: CalendarEventSpec) {
  const { start, end } = formatDates(event)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description,
    ...(event.location ? { location: event.location } : {}),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function downloadIcs(event: CalendarEventSpec) {
  const { start, end, allDay } = formatDates(event)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Devcon//devcon.org//EN',
    'BEGIN:VEVENT',
    allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
    allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}`,
    ...(event.location ? [`LOCATION:${event.location}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = event.filename ?? 'devcon-8.ics'
  a.click()
  URL.revokeObjectURL(url)
}

type Variant = 'light' | 'dark'

interface AddToCalendarPopoverProps {
  children: (props: { open: boolean; toggle: () => void }) => React.ReactNode
  popoverPosition?: 'top' | 'bottom'
  popoverAlign?: 'left' | 'right'
  className?: string
  // Calendar entry offered by the popover; defaults to the Devcon 8 event.
  // Pass a custom spec for other moments (e.g. the ticket launch reminder).
  event?: CalendarEventSpec
}

/**
 * Trigger-agnostic version of the add-to-calendar control. Takes a render-prop
 * `children` that receives `{ open, toggle }` and renders the trigger element.
 * Click-outside dismissal is handled by the wrapping container.
 */
export const AddToCalendarPopover = ({
  children,
  popoverPosition = 'top',
  popoverAlign = 'left',
  className = '',
  event = DEVCON_EVENT,
}: AddToCalendarPopoverProps) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {children({ open, toggle: () => setOpen(v => !v) })}

      {open && (
        <div
          className={`absolute ${popoverPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${
            popoverAlign === 'right' ? 'right-0' : 'left-0'
          } bg-white rounded-xl shadow-lg border border-[#221144]/10 p-1.5 pr-7 flex flex-col gap-0.5 min-w-[180px] z-20 text-left text-sm leading-5`}
        >
          <button
            type="button"
            className="absolute top-1.5 right-1.5 text-[#594d73] hover:text-[#160b2b] leading-none"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X size={14} />
          </button>
          <a
            href={getGoogleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-2.5 py-1.5 text-sm font-medium text-[#160b2b] hover:bg-[#f2f1f4] rounded-md transition-colors leading-5"
            onClick={() => setOpen(false)}
          >
            Google Calendar
          </a>
          <button
            type="button"
            className="block w-full px-2.5 py-1.5 text-sm font-medium text-[#160b2b] hover:bg-[#f2f1f4] rounded-md transition-colors text-left leading-5"
            onClick={() => {
              downloadIcs(event)
              setOpen(false)
            }}
          >
            Download .ics
          </button>
        </div>
      )}
    </div>
  )
}

interface AddToCalendarButtonProps {
  className?: string
  variant?: Variant
  popoverPosition?: 'top' | 'bottom'
}

export const AddToCalendarButton = ({
  className = '',
  variant = 'light',
  popoverPosition = 'top',
}: AddToCalendarButtonProps) => {
  const buttonClass =
    variant === 'dark'
      ? 'bg-white/80 hover:bg-white border border-[rgba(34,17,68,0.1)] text-[#1a0d33]'
      : 'bg-white/80 hover:bg-white border border-[#221144]/10 text-[#1a0d33]'

  return (
    <AddToCalendarPopover className={className} popoverPosition={popoverPosition}>
      {({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={`${buttonClass} transition-colors font-bold text-sm rounded-full px-6 py-3 flex items-center gap-2 justify-center cursor-pointer whitespace-nowrap`}
        >
          Add to Calendar
          <CalendarPlus className="w-4 h-4" strokeWidth={2.5} />
        </button>
      )}
    </AddToCalendarPopover>
  )
}
