import React from 'react'
import Image from 'next/image'
import NextLink from 'next/link'
import BannerImage from './images/devcon-8-india-bg.png'
import DevconLogo from './images/devcon-8-india-logo.svg'
import IconX from 'assets/icons/twitter.svg'
import IconInstagram from 'assets/icons/instagram.svg'
import IconTelegram from 'assets/icons/telegram.svg'
import IconEmail from 'assets/icons/ui-email.svg'
import { Link } from 'components/common/link'
import useGetElementHeight from 'hooks/useGetElementHeight'
import { useTicketsCtaLabel } from 'hooks/useWaveStates'
import { EVENT_APP_ORIGIN } from 'config/eventApp'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AppPreviewPhone } from './AppPreviewPhone'

// Hero CTA pill: 48px / 16px on phones (Button-Default, as the mobile menu's
// CTAs — Figma draws Button-Small there but it read too short), 40px / 14px on
// tablet (Figma Button-Small), the shared 16px recipe (pl-32 pr-28 py-16,
// min-h 36, as cta.ts) from lg up. px literals: the
// root font-size drops to 14px ≤1024 so rem utilities would shrink.
const heroPill =
  'inline-flex items-center justify-center gap-[4px] rounded-full h-[48px] px-[32px] text-[16px] md:h-[40px] md:px-[16px] md:py-[8px] md:text-[14px] lg:h-auto lg:min-h-[36px] lg:min-w-0 lg:pl-[32px] lg:pr-[28px] lg:py-[16px] lg:text-[16px] font-bold leading-none whitespace-nowrap transition-[transform,opacity,background-color] duration-150 ease-out motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]'
const heroPillPrimary = `${heroPill} bg-[#7235ed] border border-[#7235ed] text-[#f9f8fa] hover:opacity-90`
const heroPillSecondary = `${heroPill} bg-white border border-[rgba(34,17,68,0.1)] text-[#1a0d33] hover:bg-white/90`

const textShadow = '[text-shadow:0_4px_8px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.15)]'

export const Hero = () => {
  const t = useTranslations('home.hero')
  const stripHeight = useGetElementHeight('strip')
  // "Get tickets" whenever buying is possible right now, "View tickets"
  // otherwise — the site-wide rule. The label stays invisible until the client
  // clock has resolved the wave, so it never flips in front of the visitor.
  const { canBuy, mounted } = useTicketsCtaLabel()

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

      {/* Hero content at bottom. One grid, three layouts (Figma 5240:67992 /
          5240:67264 / 5241:390):
          - mobile: one centred column — logo+text, buttons, social
          - md:     logo+text left (spanning both rows); buttons over the social
                    card in a 380px right column
          - lg:     logo+text over buttons on the left; one right cell spanning
                    both rows with the phone over the social card */}
      <div className="absolute bottom-0 left-0 right-0 pb-[40px] lg:pb-[56px]">
        <div className="section">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_380px] md:items-end md:gap-x-[32px] md:grid-rows-[1fr_auto] lg:grid-cols-[auto_auto] lg:justify-between">
            {/* Logo + location */}
            <div className="flex flex-col items-center md:items-start gap-[16px] lg:gap-[24px] md:row-span-2 lg:row-span-1 lg:col-start-1 lg:row-start-1 [filter:drop-shadow(0_2px_4px_#214)] lg:[filter:drop-shadow(0_2px_6px_#214)]">
              <DevconLogo className="w-[162px] md:w-[176px] lg:w-[263px] h-auto text-white" />
              <div className="flex flex-col items-center md:items-start gap-[4px] md:gap-[8px] text-white text-center md:text-left tracking-[-0.5px]">
                <h1 className="text-[32px] lg:text-[48px] font-extrabold leading-[1.2]">{t('location')}</h1>
                <p className="text-[24px] lg:text-[35px] font-normal leading-[1.2]">{t('dates')}</p>
              </div>
            </div>

            {/* CTAs: tickets (wave-driven label) + the app. flex-1 only once the
                row is horizontal: in the mobile column a 0% flex-basis overrides
                the pill's fixed height. Figma's left column is the width of the
                date line, so the pills share it (min-w-0 lets them). */}
            {/* lg: w-0 + min-w-full keeps the row out of the column's intrinsic
                width, so the pills stretch exactly to the date line above them
                instead of widening the column. */}
            <div className="flex flex-col md:flex-row gap-[12px] w-full mt-[16px] md:mt-0 lg:mt-[32px] lg:w-0 lg:min-w-full md:col-start-2 md:row-start-1 lg:col-start-1 lg:row-start-2">
              <NextLink href="/tickets" className={`md:flex-1 ${heroPillPrimary}`}>
                <span className={mounted ? '' : 'invisible'}>
                  {canBuy ? t('get_tickets_button') : t('view_tickets_button')}
                </span>
                <ArrowRight className="w-[16px] h-[16px]" strokeWidth={2.5} />
              </NextLink>
              <Link to={EVENT_APP_ORIGIN} className={`md:flex-1 ${heroPillSecondary}`}>
                {t('app_button')}
                <ArrowUpRight className="w-[16px] h-[16px]" strokeWidth={2.5} />
              </Link>
            </div>

            {/* Right column: phone card (desktop, see AppPreviewPhone) over the
                social card. One cell so the pair is
                centred on each other and the gap holds whatever the left
                column's height is; on md it is just the social card under the
                buttons. */}
            <div className="flex flex-col items-center gap-[24px] w-full mt-[16px] md:col-start-2 md:row-start-2 lg:row-start-1 lg:row-span-2 lg:self-end lg:w-auto">
              {/* Phone + "Plan your schedule" (Figma 5241:501): desktop frame up, and
                  only when the hero is tall enough to hold the 488px block above
                  the social card without climbing into the nav. */}
              <div className="hidden lg:[@media(min-height:720px)]:flex flex-col items-center gap-[8px] text-white text-center">
                <p className={`relative z-10 text-[12px] font-semibold tracking-[2px] uppercase leading-none ${textShadow}`}>
                  {t('app_eyebrow')}
                </p>
                <AppPreviewPhone href={EVENT_APP_ORIGIN} alt={t('app_preview_alt')} caption={t('app_install')} />
              </div>

              {/* Social links */}
              <div className="w-full backdrop-blur-[3px] bg-[rgba(26,13,51,0.8)] border border-solid border-[rgba(255,255,255,0.1)] rounded-[8px] px-[16px] py-[8px] flex items-center justify-between gap-[16px] [&_path]:!fill-white">
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
    </div>
  )
}
