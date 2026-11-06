import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import { Link } from 'components/common/link'
import { Search } from 'lucide-react'
import cn from 'classnames'
import { useLocale, useTranslations } from 'next-intl'
import { EVENT_TYPES, type EventType, type RoadEvent } from './events'

// Fallback card link for events without a URL — the rtd-event-form.
const LISTING_FORM_URL = '/form/rtd-event-form'

// ISO 'YYYY-MM-DD' (or 'YYYY-MM') → a UTC Date, so locale date formatters
// don't shift the day across timezones.
function isoToUTCDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}
function monthKey(iso: string): string {
  const [y, m] = iso.split('-')
  return `${y}-${m}`
}

type MonthGroup = { key: string; events: RoadEvent[] }

function groupByMonth(events: RoadEvent[]): MonthGroup[] {
  const map = new Map<string, RoadEvent[]>()
  for (const e of [...events].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = monthKey(e.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return [...map.entries()].map(([key, evs]) => ({ key, events: evs }))
}

function EventCard({ event, dateLabel }: { event: RoadEvent; dateLabel: string }) {
  return (
    <Link
      to={event.url ?? LISTING_FORM_URL}
      className="group flex flex-col overflow-hidden rounded-2xl outline outline-1 outline-[#221144]/10 bg-white transition-[box-shadow,transform] duration-150 ease-out hover:scale-[1.03] hover:shadow-md hover:shadow-[#221144]/10 active:scale-[0.97] active:shadow-none"
    >
      {/* Standard 16:9 image ratio; height follows card width. Lets uploaders use a
          standard size without cropping; object-cover still handles off-ratio images. */}
      <div className={cn('relative aspect-video w-full overflow-hidden bg-gradient-to-b', event.gradient)}>
        {/* Only render an image when the event actually has one — otherwise the
            card's random gradient (on the container) shows through. unoptimized:
            images are pre-resized card WebPs served straight from Supabase's CDN
            with immutable caching, so /_next/image would only re-transform for no gain. */}
        {event.image && <Image src={event.image} alt="" fill unoptimized className="object-cover" />}
        <span className="absolute right-3 top-3 rounded bg-[rgba(34,17,68,0.7)] px-2.5 py-2 text-xs font-bold uppercase leading-none tracking-[0.5px] text-white backdrop-blur-[3px]">
          {event.city}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <h3 className="text-base font-bold leading-[1.1] text-[#160b2b]">{event.title}</h3>
        <p className="flex items-center gap-1 text-sm leading-none">
          <span className="font-semibold text-[#1a0d33]">{dateLabel}</span>
          <span className="text-[#594d73]">•</span>
          <span className="text-[#594d73]">{event.host}</span>
        </p>
      </div>
    </Link>
  )
}

export function RoadToDevconEvents({ events }: { events: RoadEvent[] }) {
  const t = useTranslations('road_to_devcon')
  const locale = useLocale()
  const monthFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    [locale]
  )
  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    [locale]
  )
  const [query, setQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(new Set())

  const toggleType = (type: EventType) =>
    setActiveTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = events.filter(e => {
      if (activeTypes.size > 0 && !e.types.some(t => activeTypes.has(t))) return false
      if (q) {
        const haystack = `${e.title} ${e.host} ${e.city} ${e.types.join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    return groupByMonth(filtered)
  }, [events, query, activeTypes])

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
        // Lavender base + the DC8 lotus/moon graphic anchored bottom-center at a
        // fixed 1440px width (the design frame width) — it fills the width on
        // desktop and crops symmetrically on narrower screens rather than shrinking.
        backgroundColor: '#ECEAFB',
        backgroundImage: 'url(/road-to-devcon/moon-bg.svg)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center bottom',
        backgroundSize: '1440px auto',
      }}
    >
      {/* Heading + search */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[2px] text-[#7235ed]">{t('events.eyebrow')}</p>
          <h2 className="mt-3 text-[32px] font-extrabold leading-[1.2] tracking-[-0.5px]">{t('events.title')}</h2>
        </div>
        <div className="relative w-full lg:w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#594d73]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('events.search_placeholder')}
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
              {t(`events.types.${type}`)}
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

              <div className="min-w-0 flex-1 pb-6">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xl font-extrabold leading-none text-[#160b2b]">
                    {monthFmt.format(isoToUTCDate(group.key))}
                  </h3>
                  <span className="text-base text-[#594d73]">
                    {t('events.count', { count: group.events.length })}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1250px]:grid-cols-3">
                  {group.events.map(event => (
                    <EventCard key={event.id} event={event} dateLabel={dayFmt.format(isoToUTCDate(event.date))} />
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="py-12 text-center text-[#594d73]">{t('events.empty')}</p>
        )}
      </div>

      {/* Co-hosted-by strip — text + logo in a row on desktop, stacked on mobile */}
      <div className="mt-8 flex flex-col items-center justify-center gap-x-4 gap-y-3 sm:flex-row">
        <p className="text-base font-medium text-[#221144]">{t('events.cohosted_by')}</p>
        <Link
          to="https://geode.build/"
          className="inline-flex cursor-pointer transition-transform duration-150 ease-out hover:scale-[1.03]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/road-to-devcon/geode-labs.png" alt="Geode Labs" className="h-10 w-auto object-contain" />
        </Link>
      </div>

    </section>
  )
}

export default RoadToDevconEvents
