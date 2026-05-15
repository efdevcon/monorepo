import React from 'react'
import Image, { type StaticImageData } from 'next/image'
import ReactMarkdown from 'react-markdown'
import FaqBg from 'components/domain/landing-page/images/new/faq-bg.svg'
import { Faq, FaqItem } from 'components/common/faq'
import { BloomingEthFlower } from 'components/domain/landing-page/BloomingEthFlower'
import { Link } from 'components/common/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface BottomFAQProps {
  heading: string
  items: FaqItem[]
  viewAllLabel: string
  viewAllHref: string
  // Banner image rendered above the FAQ block. Each page passes its own asset
  // so the imagery matches the page's theme; styling is shared (full-bleed
  // wide aspect ratio + bottom-anchored crop + subtle darkening gradient).
  banner?: StaticImageData
  bannerAlt?: string
}

export const BottomFAQ = ({ heading, items, viewAllLabel, viewAllHref, banner, bannerAlt = '' }: BottomFAQProps) => {
  return (
    <>
      {banner && (
        <div className="relative w-full aspect-[430/180] sm:aspect-[1440/320] overflow-hidden">
          <Image src={banner} alt={bannerAlt} fill className="object-cover object-bottom" />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(34,17,68,0.57)] to-transparent mix-blend-overlay pointer-events-none" />
        </div>
      )}

      <div className="relative bg-[#fff0e6] pt-12 sm:pt-20 pb-10 sm:pb-16 px-5 sm:px-8 md:px-16 flex flex-col items-center gap-6 sm:gap-8 overflow-hidden">
      <FaqBg
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[35%] w-[1770px] max-w-none h-[810px] pointer-events-none select-none opacity-60"
      />

      <h2 className="relative text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b] text-center">
        {heading}
      </h2>

      <div className="relative w-full max-w-[760px]">
        <Faq items={items} />
      </div>

      <Link
        to={viewAllHref}
        className="relative inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold leading-none text-[#1a0d33] bg-white/80 border border-[#dddae2] rounded-full hover:bg-white transition-colors min-h-[36px] whitespace-nowrap"
      >
        {viewAllLabel}
        <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2.5} />
      </Link>

      <BloomingEthFlower className="relative w-[120px] h-[120px]" />
    </div>
    </>
  )
}

// Builds the standard FAQ items used on the home + tickets pages from the
// home.faq.* translation namespace. If `itemsProp` is supplied (e.g. from a
// NocoDB-synced FAQ feed), those are used instead; otherwise we fall back to
// the inline-translated copy. Item 2 has structured (bulleted) content that
// can't be expressed as a flat string, so it's composed here directly.
export function useStandardFaqItems(
  itemsProp?: Array<{ question: string; answer: string }>,
): FaqItem[] {
  const tFaq = useTranslations('home.faq')

  if (itemsProp && itemsProp.length > 0) {
    return itemsProp.map(i => ({
      q: i.question,
      a: <ReactMarkdown>{i.answer}</ReactMarkdown>,
    }))
  }

  return [
    { q: tFaq('item_1.q'), a: tFaq('item_1.a') },
    {
      q: tFaq('item_2.q'),
      a: (
        <>
          <p>{tFaq('item_2.a_intro')}</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
            <li>
              <strong>{tFaq('item_2.community_h')}</strong> — {tFaq('item_2.community_b')}
            </li>
            <li>
              <strong>{tFaq('item_2.applications_h')}</strong> — <em>{tFaq('item_2.applications_b')}</em>
            </li>
            <li>
              <strong>{tFaq('item_2.ecosystem_h')}</strong> — <em>{tFaq('item_2.ecosystem_b')}</em>
            </li>
          </ul>
        </>
      ),
    },
    { q: tFaq('item_3.q'), a: tFaq('item_3.a') },
  ]
}
