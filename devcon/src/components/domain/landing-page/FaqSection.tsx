import React from 'react'
import ReactMarkdown from 'react-markdown'
import FaqBg from './images/new/faq-bg.svg'
import { Faq, FaqItem } from 'components/common/faq'
import { BloomingEthFlower } from './BloomingEthFlower'
import { Link } from 'components/common/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface FaqSectionProps {
  items?: Array<{ question: string; answer: string }>
}

export const FaqSection = ({ items: itemsProp }: FaqSectionProps) => {
  const t = useTranslations('home.faq_section')
  const tFaq = useTranslations('home.faq')

  const faqItems: FaqItem[] = itemsProp && itemsProp.length > 0
    ? itemsProp.map(i => ({
        q: i.question,
        a: <ReactMarkdown>{i.answer}</ReactMarkdown>,
      }))
    : [
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

  return (
    <div className="relative bg-[#fff0e6] pt-12 sm:pt-20 pb-10 sm:pb-16 px-5 sm:px-8 md:px-16 flex flex-col items-center gap-6 sm:gap-8 overflow-hidden">
      <FaqBg
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[35%] w-[1770px] max-w-none h-[810px] pointer-events-none select-none opacity-60"
      />

      <h2 className="relative text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b] text-center">
        {t('heading')}
      </h2>

      <div className="relative w-full max-w-[760px]">
        <Faq items={faqItems} />
      </div>

      <Link
        to="/tickets/faq"
        className="relative inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold leading-none text-[#1a0d33] bg-white/80 border border-[#dddae2] rounded-full hover:bg-white transition-colors min-h-[36px] whitespace-nowrap"
      >
        {t('view_all')}
        <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2.5} />
      </Link>


      <BloomingEthFlower className="relative w-[120px] h-[120px]" />
    </div>
  )
}
