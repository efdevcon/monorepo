import React from 'react'
import { Link } from 'components/common/link'
import { Users, HandHeart, Handshake, ArrowRight, ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { sectionX, sectionInner, sectionHeading, eyebrow, bodyCopy, cardTitle } from 'components/common/styles'
import { Reveal, RevealGroup } from 'components/common/reveal/Reveal'

// Translatable text comes from intl; these are the per-card layout meta (icon + link).
// Index-aligned with the intl `cards` array — don't reorder either one (hi/mr
// translations pair by index); displayOrder controls on-screen position instead.
const cardMeta = [
  { icon: Users, href: 'https://forum.devcon.org/t/rfp-13-devcon-8-india-community-hubs/8657', external: true },
  { icon: HandHeart, closed: true }, // volunteer — applications closed
  { icon: Handshake, href: '/supporters', external: false },
] as Array<{ icon: typeof Users; href?: string; external?: boolean; closed?: boolean }>

// Volunteer card moved last since its applications closed
const displayOrder = [0, 2, 1]

/**
 * "Help make Devcon happen" — Figma node 4917:966. Three contributor cards
 * (Community Hub / Volunteer / Supporters), successor to ContributeAndSupport.
 */
export const GetInvolved = () => {
  const t = useTranslations('home.contribute')
  const cards = (t.raw('cards') as Array<{ title: string; body: string; cta: string }>).slice(0, cardMeta.length)

  return (
    <div
      className={`${sectionX} pt-[48px] xl:pt-[64px] pb-[104px] flex flex-col items-center gap-[32px] sm:gap-[48px]`}
    >
      <Reveal className="text-center max-w-[720px] flex flex-col gap-[16px]">
        <p className={eyebrow}>{t('eyebrow')}</p>
        <h2 className={sectionHeading}>{t('heading')}</h2>
        <p className={`${bodyCopy} text-[#1a0d33]`}>{t('subheading')}</p>
      </Reveal>

      <RevealGroup className={`w-full ${sectionInner} grid grid-cols-1 lg:grid-cols-3 gap-[16px]`}>
        {displayOrder.map((cardIndex, i) => {
          const c = cards[cardIndex]
          const meta = cardMeta[cardIndex]
          const Icon = meta.icon

          const cardBody = (
            <div className="flex flex-col gap-[8px]">
              <div className="flex items-center justify-between gap-3">
                <h3 className={cardTitle}>{c.title}</h3>
                <Icon className="w-[32px] h-[32px] shrink-0 text-[#7235ed]" strokeWidth={1.75} />
              </div>
              <p className={`${bodyCopy} text-[#221144]`}>{c.body}</p>
            </div>
          )

          if (meta.closed) {
            // Static card — applications closed, so no link and no hover interaction
            return (
              <Reveal key={cardIndex} delay={i * 120}>
                <div className="h-full bg-white/50 backdrop-blur-[6px] outline outline-1 outline-[rgba(34,17,68,0.1)] rounded-2xl p-[24px] flex flex-col gap-[24px] justify-between lg:min-h-[224px]">
                  {cardBody}
                  <span className="text-[16px] font-bold leading-none text-[#221144]/60">{t('applications_closed')}</span>
                </div>
              </Reveal>
            )
          }

          return (
            // Whole card is the link — travel-guide hotel-card interaction
            // (scale on hover/press, shadow on hover). Figma 4920:98735 spacing:
            // 24px padding, 24px body→CTA gap, natural height in single column.
            <Reveal key={cardIndex} delay={i * 120}>
              <Link
                to={meta.href!}
                className="group h-full bg-white/50 backdrop-blur-[6px] hover:bg-white outline outline-1 outline-[rgba(34,17,68,0.1)] rounded-2xl p-[24px] flex flex-col gap-[24px] justify-between lg:min-h-[224px] transition-[background-color,box-shadow,transform] duration-150 [transition-timing-function:ease-out] hover:shadow-md motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]"
              >
                {cardBody}

                <span className="inline-flex items-center gap-2 text-[#7235ed] font-bold text-[16px] leading-none group-hover:underline">
                  {c.cta}
                  {meta.external ? (
                    <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                  ) : (
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  )}
                </span>
              </Link>
            </Reveal>
          )
        })}
      </RevealGroup>
    </div>
  )
}
