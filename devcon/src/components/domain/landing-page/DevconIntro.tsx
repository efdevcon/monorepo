import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { CalendarPlus, X } from 'lucide-react'
import dc8Logo from 'assets/images/dc-8/dc8-logo.png'
import jioVenue from './images/jio-venue.png'
import JwcLogo from './images/jwc-logo.svg'
import css from './landing-page.module.scss'

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

export function DevconIntro() {
  const [showCalendarModal, setShowCalendarModal] = useState(false)
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
    <div className="section">
      <div className={css['section-wrapper']}>
        <div style={{ marginBottom: 16 }}>
          <Image src={dc8Logo} alt="Devcon 8 India" width={145} height={64} />
        </div>
        <div className={css.intro}>
          <div className={css['intro-copy']}>
            <h2 className={css['intro-title']}>
              Devcon is the Ethereum conference for developers, thinkers, and makers.
            </h2>
            <p className={css['intro-subtitle']}>
              {`Devcon's mission is to bring decentralized protocols, tools, and culture to the people and make Ethereum more accessible around the world.`}
            </p>
            <p className={css['intro-body']}>
              {`Whether you're a seasoned Ethereum expert or just starting, Devcon is for you. It's an intensive introduction for new Ethereum explorers, a global family reunion for those already a part of our ecosystem, and a source of energy and creativity for all.`}
            </p>
          </div>
          <div className={css['venue-card']}>
            <div className={css['venue-top']}>
              <div className={css['venue-image']}>
                <Image src={jioVenue} alt="Jio World Centre" fill style={{ objectFit: 'cover' }} />
              </div>
              <JwcLogo className={css['venue-logo']} />
            </div>
            <div className={css['venue-bottom']}>
              <div className={css['venue-info']}>
                <span className={css['venue-location']}>Mumbai, India</span>
                <span className={css['venue-date']}>{`3\u20136 November, 2026`}</span>
              </div>
              <div style={{ position: 'relative' }}>
                <button className={css['venue-cta']} onClick={() => setShowCalendarModal(v => !v)}>
                  Add to Calendar
                  <CalendarPlus size={16} />
                </button>
                {showCalendarModal && (
                  <div ref={modalRef} className={css['calendar-modal']}>
                    <button
                      className={css['calendar-modal-close']}
                      onClick={() => setShowCalendarModal(false)}
                      aria-label="Close"
                    >
                      <X size={14} />
                    </button>
                    <a
                      href={getGoogleCalendarUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={css['calendar-modal-option']}
                      onClick={() => setShowCalendarModal(false)}
                    >
                      Google Calendar
                    </a>
                    <button
                      className={css['calendar-modal-option']}
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
          </div>
        </div>
      </div>
    </div>
  )
}
