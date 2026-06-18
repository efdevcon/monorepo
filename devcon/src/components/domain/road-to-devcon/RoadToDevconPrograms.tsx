import React from 'react'
import { Link } from 'components/common/link'
import { University, Sprout, Handshake, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

// Text comes from the `road_to_devcon.programs.<key>` i18n keys.
const PROGRAMS = [
  { icon: University, to: '/academic-program', key: 'academic' },
  { icon: Sprout, to: '/ecosystem-program', key: 'ecosystem' },
  { icon: Handshake, to: '/supporters', key: 'supporters' },
] as const

export function RoadToDevconPrograms() {
  const t = useTranslations('road_to_devcon')
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
          {t('programs.title')}
        </h2>

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {PROGRAMS.map(({ icon: Icon, to, key }) => (
            <div
              key={key}
              className="flex flex-col gap-4 rounded-2xl border border-white/20 bg-[rgba(34,17,68,0.15)] p-6 shadow-[0_2px_8px_0_rgba(34,17,68,0.15)] backdrop-blur-[6px]"
            >
              <Icon size={32} strokeWidth={1.5} className="text-[#b08df5]" />
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-extrabold leading-[26px] text-[#f9f8fa]">{t(`programs.${key}.title`)}</h3>
                <p className="text-sm font-light leading-5 text-[#f9f8fa]">{t(`programs.${key}.description`)}</p>
              </div>
              <Link
                to={to}
                className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-[#b08df5] transition-colors hover:text-white"
              >
                {t('common.learn_more')}
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
