import React from 'react'
import Image from 'next/image'
import NextLink from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFeaturedWave, useTicketsCtaLabel } from 'hooks/useWaveStates'
import { ctaPrimary } from 'components/common/cta'
import {
  sectionX,
  sectionInner,
  sectionHeading,
  eyebrow,
  bodyCopy,
  cardTitle,
  glassCard,
} from 'components/common/styles'
import { Reveal, RevealGroup } from 'components/common/reveal/Reveal'
import CrescentMoons from './images/new/crescent-moons.svg'
import JoinLearn from './images/new/join-learn.jpg'
import JoinConnect from './images/new/join-connect.jpg'
import JoinLeave from './images/new/join-leave.jpg'
import JoinSpirit from './images/new/join-spirit.jpg'

const CARD_IMAGES = [JoinLearn, JoinConnect, JoinLeave, JoinSpirit]

/**
 * "Join the event" — Figma node 4917:660. Four glass photo cards with the
 * wave-driven tickets CTA carried over from the old WhatToExpect section.
 */
export const JoinTheEvent = () => {
  const t = useTranslations('home.join_event')
  const cards = t.raw('cards') as Array<{ title: string; body: string; image_alt: string }>
  const { label: ctaLabel } = useTicketsCtaLabel()
  const { featured } = useFeaturedWave()
  // CTA eyebrow: during the live sale it reads "General Admission available now!";
  // before launch it names the upcoming wave, else the generic join prompt.
  const ctaEyebrow =
    featured?.status === 'live'
      ? t('tickets_launch_eyebrow_live')
      : featured
      ? `${featured.wave.name} tickets`
      : t('tickets_launch_eyebrow')

  return (
    <div
      className={`relative ${sectionX} py-[48px] sm:py-[64px] overflow-hidden`}
      style={{
        // Peach washes only — the section is transparent over the page-level
        // #fbfafc→#eaeefe gradient (Figma group 4935:2865).
        background:
          'radial-gradient(ellipse 57% 48% at 107% 50%, rgba(255,224,204,1) 0%, rgba(255,224,204,0) 100%), ' +
          'radial-gradient(ellipse 57% 48% at -7% 50%, rgba(255,224,204,1) 0%, rgba(255,224,204,0) 100%)',
      }}
    >
      {/* Crescent moon arcs at each edge, desktop only — mirrored on the right (Figma 4917:661 / 4921:101324) */}
      <div
        aria-hidden
        className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-[360px] h-[525px] opacity-[0.03] overflow-hidden pointer-events-none select-none"
      >
        <CrescentMoons className="absolute right-0 top-0 w-[625px] h-[525px] max-w-none -scale-x-100" />
      </div>
      <div
        aria-hidden
        className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[360px] h-[525px] opacity-[0.03] overflow-hidden pointer-events-none select-none -scale-x-100"
      >
        <CrescentMoons className="absolute right-0 top-0 w-[625px] h-[525px] max-w-none -scale-x-100" />
      </div>

      <div className={`relative flex flex-col gap-[32px] sm:gap-[48px] ${sectionInner}`}>
        <Reveal className="flex flex-col gap-[16px]">
          <p className={eyebrow}>{t('eyebrow')}</p>
          <h2 className={sectionHeading}>{t('heading')}</h2>
          <p className={`${bodyCopy} text-[#1a0d33]`}>{t('subheading')}</p>
        </Reveal>

        {/* Glass photo cards: stacked mobile (image on top), 2x2 desktop (image right) */}
        <RevealGroup className="grid grid-cols-1 xl:grid-cols-2 gap-[24px]">
          {cards.map((c, i) => (
            <Reveal key={i} delay={i * 120}>
              <div
                className={`relative flex flex-col md:flex-row md:items-center md:h-[206px] md:gap-6 overflow-hidden ${glassCard} shadow-[0_2px_8px_rgba(34,17,68,0.06),0_1px_2px_rgba(34,17,68,0.1)]`}
              >
                <div className="order-1 md:order-2 relative w-full h-[206px] md:w-[224px] md:h-full shrink-0">
                  <Image
                    src={CARD_IMAGES[i]}
                    alt={c.image_alt}
                    fill
                    sizes="(max-width: 767px) 100vw, 224px"
                    className="object-cover"
                  />
                </div>
                <div className="order-2 md:order-1 flex-1 min-w-0 flex flex-col gap-[8px] justify-center p-[20px] md:pl-6 md:py-6 md:pr-0">
                  <h3 className={cardTitle}>{c.title}</h3>
                  <p className={`${bodyCopy} text-[#221144]`}>{c.body}</p>
                </div>
                {/* Inset sheen as an overlay: the card is overflow-hidden with a full-bleed
                  photo that would paint over an inset box-shadow on the card itself */}
                <div
                  aria-hidden
                  className="absolute -inset-px pointer-events-none rounded-[inherit] shadow-[inset_0_-2px_16px_rgba(255,255,255,0.66)]"
                />
              </div>
            </Reveal>
          ))}
        </RevealGroup>

        {/* Ticket sale CTA — wave-driven eyebrow + label */}
        <Reveal className="flex flex-col items-center gap-[16px]">
          <p className={`${eyebrow} text-center`}>{ctaEyebrow}</p>
          <NextLink href="/tickets" className={`w-full md:w-auto ${ctaPrimary}`}>
            {ctaLabel}
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </NextLink>
        </Reveal>
      </div>
    </div>
  )
}
