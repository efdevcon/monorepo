import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'components/common/link'
import { Search, ArrowRight } from 'lucide-react'
import cn from 'classnames'
import { EVENT_TYPES, type EventType, type RoadEvent } from './events'

// Where "Apply now" (get an event listed) points — the rtd-event-form.
const LISTING_FORM_URL = '/form/rtd-event-form'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Date helpers parse the ISO string directly (no Date()) to stay timezone-safe.
function dayMonthLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_SHORT[m - 1]}`
}
function monthKey(iso: string): string {
  const [y, m] = iso.split('-')
  return `${y}-${m}`
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS_LONG[m - 1]} ${y}`
}

type MonthGroup = { key: string; label: string; events: RoadEvent[] }

function groupByMonth(events: RoadEvent[]): MonthGroup[] {
  const map = new Map<string, RoadEvent[]>()
  for (const e of [...events].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = monthKey(e.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return [...map.entries()].map(([key, evs]) => ({ key, label: monthLabel(key), events: evs }))
}

function EventCard({ event }: { event: RoadEvent }) {
  return (
    <Link
      to={event.url ?? LISTING_FORM_URL}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[rgba(34,17,68,0.1)] bg-white transition-shadow hover:shadow-[0_8px_24px_rgba(34,17,68,0.12)]"
    >
      <div className={cn('relative h-[200px] w-full overflow-hidden bg-gradient-to-b', event.gradient)}>
        {event.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className="absolute right-3 top-3 rounded bg-[rgba(34,17,68,0.7)] px-2.5 py-2 text-xs font-bold uppercase leading-none tracking-[0.5px] text-white backdrop-blur-[3px]">
          {event.city}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <h3 className="text-base font-bold leading-[1.1] text-[#160b2b]">{event.title}</h3>
        <p className="flex items-center gap-1 text-sm leading-none">
          <span className="font-semibold text-[#1a0d33]">{dayMonthLabel(event.date)}</span>
          <span className="text-[#594d73]">•</span>
          <span className="text-[#594d73]">{event.host}</span>
        </p>
      </div>
    </Link>
  )
}

function PastToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-3 text-sm text-[#1a0d33]">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors',
          value ? 'bg-[#7235ed]' : 'bg-[rgba(34,17,68,0.15)]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
            value ? 'left-[18px]' : 'left-0.5'
          )}
        />
      </button>
      Show past events
    </label>
  )
}

export function RoadToDevconEvents({ events }: { events: RoadEvent[] }) {
  const [query, setQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(new Set())
  const [showPast, setShowPast] = useState(false)
  // Resolved on the client only, so SSR (todayISO = null) renders every event
  // and avoids a hydration mismatch from the past-events filter.
  const [todayISO, setTodayISO] = useState<string | null>(null)

  useEffect(() => {
    setTodayISO(new Date().toISOString().slice(0, 10))
  }, [])

  const toggleType = (type: EventType) =>
    setActiveTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = events.filter(e => {
      if (todayISO && !showPast && e.date < todayISO) return false
      if (activeTypes.size > 0 && !e.types.some(t => activeTypes.has(t))) return false
      if (q) {
        const haystack = `${e.title} ${e.host} ${e.city} ${e.types.join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    return groupByMonth(filtered)
  }, [events, query, activeTypes, showPast, todayISO])

  const hasResults = groups.length > 0
  // Only show chips for types that actually exist in the data (the form has no
  // type column yet, so this stays hidden until one is added in NocoDB).
  const presentTypes = useMemo(
    () => EVENT_TYPES.filter(t => events.some(e => e.types.includes(t))),
    [events]
  )

  return (
    <section
      className="section relative z-10 py-16 text-[#160b2b]"
      style={{
        // Lavender base + the DC8 lotus/moon graphic anchored to the bottom,
        // scaled to full width while preserving its aspect (no distortion).
        backgroundColor: '#ECEAFB',
        backgroundImage: 'url(/road-to-devcon/moon-bg.svg)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center bottom',
        backgroundSize: '100% auto',
      }}
    >
      {/* Heading + search */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[2px] text-[#7235ed]">Get involved</p>
          <h2 className="mt-3 text-[32px] font-extrabold leading-[1.2] tracking-[-0.5px]">Road to Devcon events</h2>
        </div>
        <div className="relative w-full lg:w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#594d73]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by event, type or city"
            className="w-full rounded-lg border border-[rgba(34,17,68,0.1)] bg-white py-2.5 pl-9 pr-3 text-sm text-[#160b2b] outline-none placeholder:text-[#594d73] focus:border-[#7235ed]"
          />
        </div>
      </div>

      {/* Filter chips — only when the data actually carries types */}
      {presentTypes.length > 0 && (
      <div className="mt-6 flex flex-wrap gap-2">
        {presentTypes.map(type => {
          const active = activeTypes.has(type)
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium leading-none transition-colors',
                active
                  ? 'border-[#7235ed] bg-[#7235ed] text-white'
                  : 'border-[rgba(34,17,68,0.1)] text-[#1a0d33] hover:bg-[rgba(114,53,237,0.06)]'
              )}
            >
              {type}
            </button>
          )
        })}
      </div>
      )}

      {/* Listings */}
      <div className="mt-10">
        {hasResults ? (
          groups.map((group, gi) => (
            <div key={group.key} className="flex gap-6">
              {/* Timeline rail — fade the last segment's trailing end so the
                  line doesn't stop with a hard edge. */}
              <div className="flex w-3 shrink-0 flex-col items-center" aria-hidden>
                <span className="h-3 w-3 rounded-full bg-[#7235ed]" />
                <span
                  className={cn(
                    'mt-2 w-px flex-1 bg-[rgba(114,53,237,0.25)]',
                    gi === groups.length - 1 &&
                      '[-webkit-mask-image:linear-gradient(to_bottom,#000_55%,transparent)] [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]'
                  )}
                />
              </div>

              <div className="min-w-0 flex-1 pb-12">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-xl font-extrabold leading-none text-[#160b2b]">{group.label}</h3>
                    <span className="text-base text-[#594d73]">
                      {group.events.length} event{group.events.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {gi === 0 && <PastToggle value={showPast} onChange={setShowPast} />}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1250px]:grid-cols-3">
                  {group.events.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="py-12 text-center text-[#594d73]">No events match your filters.</p>
        )}
      </div>

      {/* "Get listed" CTA */}
      <div className="relative mt-4 flex items-center justify-center gap-6 overflow-hidden rounded-2xl bg-white/70 px-6 py-6 shadow-[0_2px_8px_rgba(34,17,68,0.08)]">
        <p className="text-center text-lg font-extrabold text-[#160b2b] sm:text-xl">
          Hosting a related event? Get it listed here
        </p>
        <Link
          to={LISTING_FORM_URL}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#7235ed] px-8 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#5f23d6]"
        >
          Apply now
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/road-to-devcon/deva.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute right-2 hidden h-[118px] w-auto select-none lg:block"
        />
      </div>
    </section>
  )
}

export default RoadToDevconEvents
