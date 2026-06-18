import React from 'react'
import { Header } from 'components/common/layouts/header'
import { Footer } from 'components/common/layouts/footer'
import { Link } from 'components/common/link'
import { RoadToDevconHero } from 'components/domain/road-to-devcon/RoadToDevconHero'
import { RoadToDevconEvents } from 'components/domain/road-to-devcon/RoadToDevconEvents'
import { RoadToDevconCommunities } from 'components/domain/road-to-devcon/RoadToDevconCommunities'
import { RoadToDevconPrograms } from 'components/domain/road-to-devcon/RoadToDevconPrograms'
import { University, Sprout, ArrowRight } from 'lucide-react'
import { getRoadToDevconEvents } from 'services/rtd-events'
import { ROAD_TO_DEVCON_EVENTS, type RoadEvent } from 'components/domain/road-to-devcon/events'
import themes from './themes.module.scss'
import css from './road-to-devcon.module.scss'

type ProgramCard = {
  icon: React.ReactNode
  title: string
  description: string
  to: string
}

const PROGRAMS: ProgramCard[] = [
  {
    icon: <University size={32} strokeWidth={1.5} className="text-[#b08df5]" />,
    title: 'Academic Program',
    description: 'Connecting students, researchers, and academic institutions with the Ethereum community.',
    to: '/academic-program',
  },
  {
    icon: <Sprout size={32} strokeWidth={1.5} className="text-[#b08df5]" />,
    title: 'Ecosystem Program',
    description: 'Grants and activations supporting local events and community initiatives across India.',
    to: '/ecosystem-program',
  },
]

function ProgramCardItem({ icon, title, description, to }: ProgramCard) {
  return (
    <div className="rounded-2xl border border-white/20 bg-[rgba(242,241,244,0.08)] p-6 shadow-[0_2px_8px_0_rgba(34,17,68,0.15)] backdrop-blur-[6px]">
      {icon}
      <h3 className="mt-6 text-xl font-extrabold">{title}</h3>
      <p className="mt-2 text-sm font-light leading-relaxed text-white">{description}</p>
      <Link
        to={to}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#b08df5] hover:text-white transition-colors cursor-pointer"
      >
        Learn more
        <ArrowRight size={14} strokeWidth={2.5} />
      </Link>
    </div>
  )
}

function AboutSection() {
  return (
    <section
      className="section relative z-10 text-white py-16"
      style={{ background: 'linear-gradient(rgba(33, 20, 71, 0) 0px, rgb(33, 20, 71) 200px, rgb(33, 20, 71) 100%)' }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        <div className="max-w-[632px]">
          <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#b08df5]">About</p>
          <h2 className="mt-3 text-[32px] leading-tight font-extrabold tracking-[-0.5px]">Road to Devcon India</h2>
          <p className="mt-6 text-xl font-medium text-white">Devcon&apos;s impact starts months before the event.</p>
          <p className="mt-4 text-base font-light leading-relaxed text-white">
            Road to Devcon brings together communities, local organizations, and new audiences through programs designed
            to amplify grassroots efforts and create long-term impact.
          </p>
          <p className="mt-4 text-base font-light leading-relaxed text-white">
            Together, our programs keep the community active, amplify local efforts and voices, and serve as preparation
            for the culmination of the year: Devcon.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROGRAMS.map(program => (
            <ProgramCardItem key={program.title} {...program} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function RoadToDevconPage({ events }: { events: RoadEvent[] }) {
  return (
    <div className={`${css['layout']} ${themes['index']}`}>
      <Header withHero />

      <RoadToDevconHero />

      <div className="w-full relative z-10">
        <AboutSection />

        <RoadToDevconEvents events={events} />

        <RoadToDevconCommunities />

        <RoadToDevconPrograms />

        <Footer dark />
      </div>
    </div>
  )
}

export async function getStaticProps() {
  // Build the events into the page (ISR, 30 min) so they're always present —
  // no client fetch / loading state. Falls back to the bundled seed if NocoDB
  // is unreachable at build/revalidate time so the section is never empty.
  let events: RoadEvent[]
  try {
    events = await getRoadToDevconEvents()
  } catch (e) {
    console.error('[road-to-devcon] event fetch failed, using seed:', e)
    events = ROAD_TO_DEVCON_EVENTS
  }
  return { props: { events }, revalidate: 1800 }
}
