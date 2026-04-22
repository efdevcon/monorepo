import React from 'react'
import { Link } from 'components/common/link'
import { CircleFadingArrowUp, Newspaper, CalendarPlus2, HandHeart, ArrowRight, ArrowUpRight } from 'lucide-react'

interface Card {
  title: string
  icon: any
  body: string
  cta?: { label: string; href: string; external?: boolean }
  disabled?: string
}

const cards: Card[] = [
  {
    title: 'Submit a DIP',
    icon: CircleFadingArrowUp,
    body: 'Devcon Improvement Proposals (DIPs) are ways for the community to suggest things to add, remove, or improve at the upcoming Devcon.',
    cta: { label: 'Visit Devcon forum', href: 'https://forum.devcon.org', external: true },
  },
  {
    title: 'Join our Creative Crew',
    icon: Newspaper,
    body: "Create content. Build hype. Grow the community. If you've got reach and a genuine love for the ecosystem, we want to collaborate with you.",
    cta: { label: 'Media Partners & Press', href: 'https://devcon.org/Devcon__Devconnect_Presskit.pdf', external: true },
  },
  {
    title: 'Host a community event',
    icon: CalendarPlus2,
    body: 'Host a meetup, workshop, or side event as part of our Ecosystem Program and make it a part of the broader Devcon India story.',
    cta: { label: 'Learn more', href: '/ecosystem-program', external: false },
  },
  {
    title: 'Volunteer program',
    icon: HandHeart,
    body: 'Join a team of passionate contributors keeping Devcon running smoothly – from registration desks to behind-the-scenes management.',
    cta: { label: 'Join the waitlist', href: '/form/volunteer-waitlist', external: false },
  },
]

export const ContributeAndSupport = () => (
  <div className="bg-[#e4d9fc] pt-12 sm:pt-[88px] pb-16 sm:pb-[104px] px-5 sm:px-8 md:px-16 flex flex-col items-center gap-8 sm:gap-12">
    <div className="text-center max-w-[720px] flex flex-col gap-3 sm:gap-4">
      <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">
        Contribute and support
      </h2>
      <p className="text-sm sm:text-base text-[#1a0d33] leading-5 sm:leading-6">
        Devcon works best when builders ship, communities show up and connect, and supporters help bring it all together.
      </p>
    </div>

    <div className="w-full max-w-[1312px] grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div
            key={c.title}
            className="bg-white border border-[#221144]/10 rounded-2xl p-5 sm:p-6 flex flex-col gap-3 sm:gap-4 justify-between min-h-[148px] sm:min-h-[168px]"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-[#160b2b] leading-[26px]">{c.title}</h3>
                <Icon className="w-8 h-8 text-[#7235ed]" strokeWidth={1.75} />
              </div>
              <p className="text-sm sm:text-base text-[#221144] leading-5 sm:leading-6">{c.body}</p>
            </div>

            {c.cta && (
              <Link
                to={c.cta.href}
                className="inline-flex items-center gap-2 text-[#7235ed] font-bold text-base hover:opacity-80 transition-opacity"
              >
                {c.cta.label}
                {c.cta.external ? (
                  <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                ) : (
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                )}
              </Link>
            )}
            {c.disabled && <p className="text-base font-bold text-[#594d73]">{c.disabled}</p>}
          </div>
        )
      })}
    </div>
  </div>
)
