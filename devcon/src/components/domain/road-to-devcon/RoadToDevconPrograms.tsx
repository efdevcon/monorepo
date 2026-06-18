import React from 'react'
import { Link } from 'components/common/link'
import { University, Sprout, Handshake, ArrowRight } from 'lucide-react'

const PROGRAMS = [
  {
    icon: University,
    title: 'Academic',
    description:
      'Shape the next generation of Ethereum builders at your campus and bring your community to Devcon in Mumbai this November.',
    to: '/academic-program',
  },
  {
    icon: Sprout,
    title: 'Ecosystem',
    description:
      'We fund local projects, events, and contributors creating spaces for learning, experimentation, and coordination on the road to Devcon 8 India.',
    to: '/ecosystem-program',
  },
  {
    icon: Handshake,
    title: 'Supporters',
    description:
      'The Supporters Program is how teams across the ecosystem contribute to Devcon and take their place within it.',
    to: '/supporters',
  },
] as const

export function RoadToDevconPrograms() {
  return (
    <section
      className="section relative z-10 py-16 text-white"
      style={{
        // Full-bleed banner: dark overlay layered over the background image, on
        // the .section element so it spans edge-to-edge while content centers.
        backgroundImage:
          'linear-gradient(rgba(34,17,71,0.25), rgba(34,17,71,0.25)), url(/road-to-devcon/programs-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="flex flex-col gap-8">
        <h2 className="text-center text-[32px] font-extrabold leading-[1.2] tracking-[-0.5px] text-[#f9f8fa] [text-shadow:0px_2px_4px_rgba(34,17,68,0.2)]">
          Join the Devcon Programs
        </h2>

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {PROGRAMS.map(({ icon: Icon, title, description, to }) => (
            <div
              key={title}
              className="flex flex-col gap-4 rounded-2xl border border-white/20 bg-[rgba(34,17,68,0.15)] p-6 shadow-[0_2px_8px_0_rgba(34,17,68,0.15)] backdrop-blur-[6px]"
            >
              <Icon size={32} strokeWidth={1.5} className="text-[#b08df5]" />
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-extrabold leading-[26px] text-[#f9f8fa]">{title}</h3>
                <p className="text-sm font-light leading-5 text-[#f9f8fa]">{description}</p>
              </div>
              <Link
                to={to}
                className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-[#b08df5] transition-colors hover:text-white"
              >
                Learn more
                <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default RoadToDevconPrograms
