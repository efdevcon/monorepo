import React from 'react'
import Image from 'next/image'
import BannerImage from './images/devcon-8-india-bg.png'
import Terminal from './images/dcix-terminal.png'
import DevconLogo from './images/devcon-8-india-logo.svg'
import IconX from 'assets/icons/twitter.svg'
import IconInstagram from 'assets/icons/instagram.svg'
import IconTelegram from 'assets/icons/telegram.svg'
import IconEmail from 'assets/icons/ui-email.svg'
import { Link } from 'components/common/link'
import useGetElementHeight from 'hooks/useGetElementHeight'
import { DEVCON_IX_ANNOUNCEMENT_URL } from 'config/devconIx'
import { useTranslations } from 'next-intl'

// Post-event hero (Figma Current-work 6068:341). The ticket/app CTAs, the
// "Going to Devcon?" phone and its eyebrow are gone; the right column is the
// Devcon IX terminal (428×355) with a VT323 "Boot the announcement" caption,
// both one link to the announcement. Left column: DC8 logo, location, date,
// then the social card (Figma 6068:355: gap 24 logo→text, 32 text→card).
// Figma only draws 1440: below md everything stacks centred (logo+text,
// terminal, social card) with the terminal capped at 300px; md gets the
// two-column grid at a 320px terminal, lg the full 428px.
const textShadow = '[filter:drop-shadow(0_2px_6px_#214)]'

export const Hero = () => {
  const t = useTranslations('home.hero')
  const stripHeight = useGetElementHeight('strip')

  return (
    <div className="relative w-full h-[90vh] md:h-screen overflow-hidden">
      {/* Background image */}
      <Image
        src={BannerImage}
        alt={t('bg_alt')}
        fill
        priority
        placeholder="blur"
        className="object-cover object-center"
        style={{ paddingTop: stripHeight }}
      />

      {/* Edge gradients for smooth blending */}
      <div
        className="absolute bottom-0 left-0 w-full h-[303px] md:h-[150px] mix-blend-hard-light pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(34,17,68,1) 4.5%, rgba(34,17,68,0) 100%)' }}
      />
      <div
        className="absolute top-0 left-0 h-full w-[60px] md:w-[160px] mix-blend-hard-light pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(34,17,68,1) 0%, rgba(34,17,68,0) 100%)' }}
      />
      <div
        className="absolute top-0 right-0 h-full w-[60px] md:w-[160px] mix-blend-hard-light pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgba(34,17,68,1) 0%, rgba(34,17,68,0) 100%)' }}
      />

      {/* Hero content at bottom (Figma 6068:354: 1312 wide, 56px up, columns
          bottom-aligned and pushed apart). Mobile: one centred column —
          logo+text, terminal, social card. md+: a 2×2 grid — logo+text over
          the social card on the left (the card stretches to that column, as
          in Figma), the terminal spanning both rows on the right. */}
      <div className="absolute bottom-0 left-0 right-0 pb-[40px] lg:pb-[56px]">
        <div className="section">
          <div className="flex flex-col items-center gap-[24px] md:grid md:grid-cols-[auto_320px] lg:grid-cols-[auto_428px] md:grid-rows-[auto_auto] md:items-end md:justify-between md:gap-x-[32px] md:gap-y-[16px] lg:gap-y-[32px]">
            {/* Logo + location (Figma 6068:355: gap 24) */}
            <div
              className={`flex flex-col items-center md:items-start gap-[16px] lg:gap-[24px] md:col-start-1 md:row-start-1 ${textShadow}`}
            >
              <DevconLogo className="w-[162px] md:w-[176px] lg:w-[263px] h-auto text-white" />
              <div className="flex flex-col items-center md:items-start gap-[4px] lg:gap-[8px] text-[#f9f8fa] text-center md:text-left tracking-[-0.5px]">
                <h1 className="text-[32px] lg:text-[48px] font-extrabold leading-[1.2]">{t('location')}</h1>
                <p className="text-[24px] lg:text-[35px] font-normal leading-[1.2] lg:leading-[28.8px]">{t('dates')}</p>
              </div>
            </div>

            {/* Devcon IX terminal + caption (Figma 6068:574): one link to the
                announcement. */}
            <Link
              to={DEVCON_IX_ANNOUNCEMENT_URL}
              className="group flex flex-col items-center gap-[16px] lg:gap-[24px] w-full max-w-[300px] md:w-[320px] md:max-w-none lg:w-[428px] md:col-start-2 md:row-start-1 md:row-span-2 md:self-end md:justify-self-end text-[#a6ffe9] hover:text-[#a6ffe9]"
            >
              <Image
                src={Terminal}
                alt={t('terminal_alt')}
                priority
                sizes="(max-width: 767px) 300px, (max-width: 1023px) 320px, 428px"
                className="w-full h-auto transition-transform duration-150 ease-out motion-safe:group-hover:scale-[1.02]"
              />
              <p className="w-full font-terminal text-[28px] lg:text-[36px] leading-none text-center [text-shadow:0_1px_6px_rgba(0,26,19,0.63)]">
                {t('announcement_cta')}
              </p>
            </Link>

            {/* Social links (Figma 6068:552: full width of the left column) */}
            <div className="w-full md:col-start-1 md:row-start-2 backdrop-blur-[3px] bg-[rgba(26,13,51,0.8)] border border-solid border-[rgba(255,255,255,0.1)] rounded-[8px] px-[16px] py-[8px] flex items-center justify-between gap-[16px] [&_path]:!fill-white">
              <p className="text-[14px] text-white leading-[20px] whitespace-nowrap">{t('follow_for_updates')}</p>
              <div className="flex gap-[16px] items-center">
                <Link to="https://x.com/efdevcon" className="text-white hover:text-white/80 transition-colors">
                  <IconX className="w-[18px] h-[18px]" />
                </Link>
                <Link to="https://instagram.com/efdevcon" className="text-white hover:text-white/80 transition-colors">
                  <IconInstagram className="w-[18px] h-[18px]" />
                </Link>
                <Link to="https://t.me/+sitvvHw8D8EzN2Yx" className="text-white hover:text-white/80 transition-colors">
                  <IconTelegram className="w-[18px] h-[18px]" />
                </Link>
                <Link to="https://paragraph.com/@efevents" className="text-white hover:text-white/80 transition-colors">
                  <IconEmail className="w-[18px] h-[18px]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
