import React, { useState, useRef, useEffect } from 'react'
import { Inbox, CalendarPlus, X } from 'lucide-react'
import { GetReminderDialog } from './GetReminderDialog'

const EVENT = {
  title: 'Devcon 8',
  location: 'Jio World Centre, Mumbai, India',
  startDate: '2026-11-03',
  endDate: '2026-11-07', // end date is exclusive in both gcal and ics all-day events
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

export const EarlyBirdBanner = () => {
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showCalendarModal) return
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowCalendarModal(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showCalendarModal])

  return (
    <div className="bg-[#ffa366] py-8 sm:py-10 px-5 sm:px-8 md:px-16 flex flex-col items-center justify-center gap-5 sm:gap-6">
      <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b] text-center">
        Early Bird tickets launch May 12
      </h2>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch w-full max-w-[502px]">
        <button
          type="button"
          onClick={() => setReminderOpen(true)}
          className="flex-1 bg-[#7235ed] hover:bg-[#6028cc] transition-colors text-white font-bold text-sm sm:text-base rounded-full px-6 sm:px-8 py-3.5 sm:py-4 flex items-center gap-2 justify-center min-h-9 cursor-pointer"
        >
          Get a reminder
          <Inbox className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setShowCalendarModal(v => !v)}
            className="w-full bg-white/80 hover:bg-white transition-colors border border-[#221144]/10 text-[#1a0d33] font-bold text-sm sm:text-base rounded-full px-5 sm:px-6 py-3.5 sm:py-4 flex items-center gap-2 justify-center min-h-9"
          >
            Add to Calendar
            <CalendarPlus className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {showCalendarModal && (
            <div
              ref={modalRef}
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-[#221144]/10 p-3 flex flex-col gap-1 min-w-[180px] z-20"
            >
              <button
                className="absolute top-2 right-2 text-[#594d73] hover:text-[#160b2b]"
                onClick={() => setShowCalendarModal(false)}
                aria-label="Close"
              >
                <X size={14} />
              </button>
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-sm font-medium text-[#160b2b] hover:bg-[#f2f1f4] rounded-lg transition-colors"
                onClick={() => setShowCalendarModal(false)}
              >
                Google Calendar
              </a>
              <button
                className="px-3 py-2 text-sm font-medium text-[#160b2b] hover:bg-[#f2f1f4] rounded-lg transition-colors text-left"
                onClick={() => {
                  downloadIcs()
                  setShowCalendarModal(false)
                }}
              >
                Download .ics
              </button>
            </div>
          )}
        </div>
      </div>

      <GetReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} />
    </div>
  )
}
