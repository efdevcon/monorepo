import React from 'react'
import { Header } from 'components/common/layouts/header'
import { Footer } from 'components/common/layouts/footer'
import { Link } from 'components/common/link'
import { RoadToDevconHero } from 'components/domain/road-to-devcon/RoadToDevconHero'
import { RoadToDevconEvents } from 'components/domain/road-to-devcon/RoadToDevconEvents'
import { RoadToDevconCommunities } from 'components/domain/road-to-devcon/RoadToDevconCommunities'
import { RoadToDevconPrograms } from 'components/domain/road-to-devcon/RoadToDevconPrograms'
import { University, Sprout, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getMessages } from 'utils/intl'
import { getRoadToDevconEvents } from 'services/rtd-events'
import { getRoadToDevconCommunities } from 'services/rtd-communities'
import { ROAD_TO_DEVCON_EVENTS, type RoadEvent } from 'components/domain/road-to-devcon/events'
import { ROAD_TO_DEVCON_COMMUNITIES, type RoadCommunity } from 'components/domain/road-to-devcon/communities'
import themes from './themes.module.scss'
import css from './road-to-devcon.module.scss'

// Text comes from the `road_to_devcon.about.programs.<key>` i18n keys.
const PROGRAMS = [
  { icon: <University size={32} strokeWidth={1.5} className="text-[#b08df5]" />, to: '/academic-program', key: 'academic' },
  { icon: <Sprout size={32} strokeWidth={1.5} className="text-[#b08df5]" />, to: '/ecosystem-program', key: 'ecosystem' },
] as const

function ProgramCardItem({
  icon,
  title,
  description,
  to,
  learnMore,
}: {
  icon: React.ReactNode
  title: string
  description: string
  to: string
  learnMore: string
}) {
  return (
    <div className="rounded-2xl outline outline-1 outline-white/20 bg-[rgba(242,241,244,0.08)] p-6 shadow-[0_2px_8px_0_rgba(34,17,68,0.15)] backdrop-blur-[6px]">
      {icon}
      <h3 className="mt-6 text-xl font-extrabold">{title}</h3>
      <p className="mt-2 text-sm font-light leading-relaxed text-white">{description}</p>
      <Link
        to={to}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#b08df5] hover:text-white transition-colors cursor-pointer"
      >
        {learnMore}
        <ArrowRight size={14} strokeWidth={2.5} />
      </Link>
    </div>
  )
}

function AboutSection() {
  const t = useTranslations('road_to_devcon')
  return (
    <section
      className="section relative z-10 text-white py-16"
      style={{ background: 'linear-gradient(rgba(33, 20, 71, 0) 0px, rgb(33, 20, 71) 200px, rgb(33, 20, 71) 100%)' }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        <div className="max-w-[632px]">
          <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#b08df5]">{t('about.eyebrow')}</p>
          <h2 className="mt-3 text-[32px] leading-tight font-extrabold tracking-[-0.5px]">{t('about.title')}</h2>
          <p className="mt-6 text-xl font-medium text-white">{t('about.lead')}</p>
          <p className="mt-4 text-base font-light leading-relaxed text-white">{t('about.p1')}</p>
          <p className="mt-4 text-base font-light leading-relaxed text-white">{t('about.p2')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROGRAMS.map(program => (
            <ProgramCardItem
              key={program.key}
              icon={program.icon}
              to={program.to}
              title={t(`about.programs.${program.key}.title`)}
              description={t(`about.programs.${program.key}.description`)}
              learnMore={t('common.learn_more')}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function RoadToDevconPage({
  events,
  communities,
}: {
  events: RoadEvent[]
  communities: RoadCommunity[]
}) {
  return (
    <div className={`${css['layout']} ${themes['index']}`}>
      <Header withHero />

      <RoadToDevconHero />

      <div className="w-full relative z-10">
        <AboutSection />

        <RoadToDevconEvents events={events} />

        <RoadToDevconCommunities communities={communities} />

        <RoadToDevconPrograms />

        <Footer dark />
      </div>
    </div>
  )
}

export async function getStaticProps(context: any) {
  const locale: string = context.locale ?? 'en'
  const messages = await getMessages(locale)

  // Build the NocoDB-backed sections into the page (ISR, 30 min) so they're
  // always present — no client fetch / loading state. Each falls back to its
  // bundled seed if NocoDB is unreachable at build/revalidate time, so a
  // section is never empty. getStaticProps can't serialize `undefined`, so the
  // result is round-tripped through JSON to drop any undefined-valued fields.
  const loadWithSeed = async <T,>(label: string, load: () => Promise<T>, seed: T): Promise<T> => {
    try {
      return JSON.parse(JSON.stringify(await load()))
    } catch (e) {
      console.error(`[road-to-devcon] ${label} fetch failed, using seed:`, e)
      return seed
    }
  }
  const [events, communities] = await Promise.all([
    loadWithSeed<RoadEvent[]>('event', getRoadToDevconEvents, ROAD_TO_DEVCON_EVENTS),
    loadWithSeed<RoadCommunity[]>('communities', getRoadToDevconCommunities, ROAD_TO_DEVCON_COMMUNITIES),
  ])
  return { props: { events, communities, messages }, revalidate: 1800 }
}
