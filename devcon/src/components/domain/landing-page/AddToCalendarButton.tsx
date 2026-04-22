import React, { useState, useRef, useEffect } from 'react'
import { CalendarPlus, X } from 'lucide-react'

const EVENT = {
  title: 'Devcon 8',
  location: 'Jio World Centre, Mumbai, India',
  startDate: '2026-11-03',
  endDate: '2026-11-07', // exclusive end date for all-day events
  description: 'Devcon is the Ethereum conference for developers, thinkers, and makers. https://devcon.org',
}

function getGoogleCalendarUrl() {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: EVENT.title,
    dates: `${EVENT.startDate.replace(/-/g, '')}/${EVENT.endDate.replace(/-/g, '')}`,
    details: EVENT.description,
    location: EVENT.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function downloadIcs() {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Devcon//devcon.org//EN',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${EVENT.startDate.replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${EVENT.endDate.replace(/-/g, '')}`,
    `SUMMARY:${EVENT.title}`,
    `DESCRIPTION:${EVENT.description}`,
    `LOCATION:${EVENT.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'devcon-8.ics'
  a.click()
  URL.revokeObjectURL(url)
}

type Variant = 'light' | 'dark'

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

  const buttonClass =
    variant === 'dark'
      ? 'bg-white/80 hover:bg-white border border-[rgba(34,17,68,0.1)] text-[#1a0d33]'
      : 'bg-white/80 hover:bg-white border border-[#221144]/10 text-[#1a0d33]'

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`${buttonClass} transition-colors font-bold text-sm rounded-full px-6 py-3 flex items-center gap-2 justify-center cursor-pointer whitespace-nowrap`}
      >
        Add to Calendar
        <CalendarPlus className="w-4 h-4" strokeWidth={2.5} />
      </button>

      {open && (
        <div
          className={`absolute ${popoverPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-white rounded-xl shadow-lg border border-[#221144]/10 p-3 flex flex-col gap-1 min-w-[180px] z-20`}
        >
          <button
            className="absolute top-2 right-2 text-[#594d73] hover:text-[#160b2b]"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X size={14} />
          </button>
          <a
            href={getGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-sm font-medium text-[#160b2b] hover:bg-[#f2f1f4] rounded-lg transition-colors"
            onClick={() => setOpen(false)}
          >
            Google Calendar
          </a>
          <button
            className="px-3 py-2 text-sm font-medium text-[#160b2b] hover:bg-[#f2f1f4] rounded-lg transition-colors text-left"
            onClick={() => {
              downloadIcs()
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
