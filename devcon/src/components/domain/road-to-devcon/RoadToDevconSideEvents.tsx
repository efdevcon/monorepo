import React, { useId } from 'react'
import cn from 'classnames'
import { Link } from 'components/common/link'
import { ArrowUpRight, CalendarDays, Globe, Sheet } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { SIDE_EVENT_CALENDARS, type CalendarPlatform, type SideEventCalendar } from './sideEventCalendars'

const PLATFORM_ICONS: Record<CalendarPlatform, typeof Globe> = {
  luma: CalendarDays,
  sheet: Sheet,
  website: Globe,
}

// Shared tag recipe — the platform tag (dark outline) and feature tags (faint
// outline) only differ in colour.
const TAG_CLASS =
  'rounded-[2px] outline outline-1 px-2 py-1 text-[11px] font-semibold uppercase leading-4 tracking-[0.5px]'

// Card type uses px literals with a 1025px step, not rem utilities: the site
// root font-size drops to 14px ≤1024 (index.scss), which would shrink rem text.
function CalendarCard({ calendar }: { calendar: SideEventCalendar }) {
  const t = useTranslations('road_to_devcon')
  const PlatformIcon = PLATFORM_ICONS[calendar.platform]
  // Name the link by its title (described by the blurb) so screen readers don't
  // announce every tag as part of the link text.
  const titleId = useId()
  const descriptionId = useId()
  return (
    <Link
      to={calendar.url}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="group flex flex-col gap-4 rounded-2xl outline outline-1 outline-[#221144]/10 bg-white p-[20px] sm:p-6 transition-[box-shadow,transform] duration-150 ease-out hover:shadow-md hover:shadow-[#221144]/10 active:shadow-none motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h3
            id={titleId}
            className="text-[18px] font-extrabold leading-[26px] text-[#160b2b] min-[1025px]:text-[20px]"
          >
            {calendar.name}
          </h3>
          <ArrowUpRight size={20} strokeWidth={2} className="mt-[3px] shrink-0 text-[#7235ed]" aria-hidden />
        </div>
        <p id={descriptionId} className="text-[14px] leading-[1.5] text-[#221144]">
          {t(`side_events.calendars.${calendar.id}`)}
        </p>
      </div>

      <ul className="mt-auto flex flex-wrap gap-2 pt-2">
        <li className={cn(TAG_CLASS, 'inline-flex items-center gap-1 text-[#221144] outline-[#221144]')}>
          <PlatformIcon size={12} strokeWidth={2.5} aria-hidden />
          {t(`side_events.platforms.${calendar.platform}`)}
        </li>
        {calendar.features.map(feature => (
          <li key={feature} className={cn(TAG_CLASS, 'text-[#594d73] outline-[#221144]/10')}>
            {t(`side_events.features.${feature}`)}
          </li>
        ))}
      </ul>
    </Link>
  )
}

export function RoadToDevconSideEvents() {
  const t = useTranslations('road_to_devcon')
  return (
    <section
      id="side-events"
      className="section relative z-10 py-16 text-[#160b2b]"
      style={{ background: 'linear-gradient(180deg, #ffe6f1 0%, hsl(51.9403deg 100% 73.7255%) 33%)' }}
    >
      <div className="flex flex-col gap-10">
        <div className="flex max-w-[632px] flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-[2px] text-[#7235ed]">{t('side_events.eyebrow')}</p>
          <h2 className="text-2xl font-extrabold leading-[1.2] tracking-[-0.5px] sm:text-[32px]">
            {t('side_events.title')}
          </h2>
          <p className="text-balance text-base leading-relaxed text-[#221144]">{t('side_events.lead')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SIDE_EVENT_CALENDARS.map(calendar => (
            <CalendarCard key={calendar.id} calendar={calendar} />
          ))}
        </div>

        <p className="text-center text-sm text-[#221144]">{t('side_events.disclaimer')}</p>
      </div>
    </section>
  )
}

export default RoadToDevconSideEvents
