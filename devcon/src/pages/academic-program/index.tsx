import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { getMessages } from 'utils/intl'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { ArrowRight, ChevronDown, ChevronUp, Microscope, Globe, Rocket } from 'lucide-react'
import themes from '../themes.module.scss'
import HeroBackground from '../ecosystem-program/hero-bg.png'
import JaaliPattern from 'assets/images/pages/ecosystem-jaali-left.svg'
import JaaliBottom from 'assets/images/pages/ecosystem-jaali-bottom.svg'
import CommunityBannerBg from '../ecosystem-program/community-banner.png'
import ArtOverlayText from 'assets/images/pages/ecosystem-art-overlay-text.svg'
import Photo1 from './photo-1.png'
import Photo2 from './photo-2.png'
import Photo3 from './photo-3.png'
import Photo4 from './photo-4.png'
import Photo5 from './photo-5.png'
import css from '../ecosystem-program/ecosystem-program.module.scss'
import cn from 'classnames'
import { TicketTable, type TicketRow } from 'components/domain/tickets/TicketTable'
import { useIsLaunched } from 'hooks/useWaveStates'

const SCROLLER_PHOTOS = [Photo1, Photo2, Photo3, Photo4, Photo5]

// Reversed color order vs. Ecosystem Program (per Figma note).
const SUPPORT_TAG_COLORS = ['#cdf4d7', '#cddff4', '#d6d5f6', '#f0d7f4', '#ffe0cc']

const WHY_JOIN_ICONS = [Microscope, Globe, Rocket]

const APPLY_HREF = 'https://esp.ethereum.foundation/applicants/rfp/rtd8_india_academic/apply'
const CONTACT_EMAIL = 'university@ethereum.foundation'

export default function AcademicProgramPage() {
  const t = useTranslations('academic_program')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  // Sanctuary Tech Builders applications open at the global ticket launch
  // (config/waves.ts GLOBAL_LAUNCH_TIME) — before that the row shows the
  // launch month, after it flips live with the Apply link.
  const { launched } = useIsLaunched()

  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>

  const NAV_LINKS = [
    { title: t('nav.about'), to: '#about' },
    { title: t('nav.why_join'), to: '#why-join' },
    { title: t('nav.who_can_apply'), to: '#who-can-apply' },
    { title: t('nav.what_you_can_receive'), to: '#what-you-can-receive' },
    { title: t('nav.apply'), to: '#apply' },
  ]

  const WHY_JOIN = WHY_JOIN_ICONS.map((icon, i) => ({
    icon,
    title: t(`why_join.items.${i}.title`),
    body: t(`why_join.items.${i}.body`),
  }))

  const SUPPORT_TAGS = SUPPORT_TAG_COLORS.map((color, i) => ({
    label: t(`support_tags.items.${i}`),
    color,
  }))

  const APPLICATION_ROWS: TicketRow[] = [
    {
      name: t('other_support.rows.0.name'),
      ethPrice: '$25',
      fiatPrice: '$25',
      action: 'Apply',
      actionHref: '/form/student-application',
    },
    {
      name: t('other_support.rows.1.name'),
      ethPrice: '$49',
      fiatPrice: '$99',
      action: 'Apply',
      actionHref: '/form/student-application',
    },
    launched
      ? {
          name: t('other_support.rows.2.name'),
          ethPrice: '$349',
          fiatPrice: '$499',
          action: 'Apply',
          actionHref: '/form/builder-application',
        }
      : {
          name: t('other_support.rows.2.name'),
          ethPrice: '$349',
          fiatPrice: '$499',
          date: t('other_support.builders_date'),
        },
  ]

  const FAQ_ITEMS = [
    {
      q: t('other_support.faq.0.q'),
      a: t('other_support.faq.0.a'),
    },
  ]

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <PageHero
        className={`${css['hero-no-side-gradient']} !mb-0`}
        titleClassName={css['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title={t('title')}
        navigation={NAV_LINKS}
      />

      <div className={cn(css['landing'], 'section')}>
        {/* ── Hero Content ─────────────────────────────── */}
        <section id="about" className={cn(css['hero-content-section'], css['scroll-anchor'], 'expand')}>
          <div className={css['jaali-left']} aria-hidden="true">
            <JaaliPattern />
          </div>
          <div className={css['jaali-right']} aria-hidden="true">
            <JaaliPattern />
          </div>
          <div className={css['jaali-bottom']} aria-hidden="true">
            <JaaliBottom />
          </div>

          <div className={css['hero-text-block']}>
            <h2 className={css['heading-2']}>
              {t('hero.heading')
                .split('\n')
                .map((line, i, arr) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
            </h2>
            <p className={css['body']}>{t('hero.body')}</p>
          </div>

          <div className={css['hero-cta-block']}>
            <Link to={APPLY_HREF} className={css['btn-primary']}>
              {t('hero.apply_button')}
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </div>
        </section>

        {/* ── Community Banner ──────────────────────────── */}
        <section className={cn(css['community-banner'], 'expand')}>
          <Image src={CommunityBannerBg} alt="" className={css['community-banner-bg']} fill sizes="100vw" />
          <p className={css['community-banner-text']}>{t.rich('community_banner', { strong })}</p>
        </section>

        {/* ── Why Join ──────────────────────────────────── */}
        <section id="why-join" className={cn(css['scroll-anchor'], 'py-8 md:py-12 lg:py-16')}>
          <div className="bg-white rounded-2xl p-6 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-8 lg:gap-12 items-start lg:items-center">
            <h3 className="text-xl md:text-2xl font-extrabold text-[#160b2b] tracking-[-0.5px] leading-[1.2] lg:w-[280px] shrink-0">
              {t('why_join.heading')}
            </h3>
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 flex-1 w-full">
              {WHY_JOIN.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex flex-col gap-3 md:gap-4 flex-1">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-[#7235ed]" strokeWidth={1.5} />
                  <div className="flex flex-col gap-2 md:gap-3">
                    <p className="text-base md:text-lg font-extrabold text-[#1a0d33] tracking-[-0.25px] leading-tight">
                      {title}
                    </p>
                    <p className="text-sm text-[#214] leading-5">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Overview ──────────────────────────────────── */}
        <section className={css['overview-section']}>
          {/* Image scroller */}
          <div className={css['image-scroller-wrapper']}>
            <div className={css['image-scroller']}>
              {[...SCROLLER_PHOTOS, ...SCROLLER_PHOTOS].map((photo, i) => (
                <div key={i} className={css['scroller-item']}>
                  <Image
                    src={photo}
                    alt={`${t('scroller_alt')} ${(i % SCROLLER_PHOTOS.length) + 1}`}
                    className={css['scroller-image']}
                    fill
                    sizes="455px"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Who can apply / What you can receive */}
          <div id="who-can-apply" className={cn(css['two-col'], css['scroll-anchor'])}>
            <div className={css['col']}>
              <h3 className={css['heading-3']}>{t('who_can_apply.heading')}</h3>
              <div className={css['body']}>
                <p style={{ marginBottom: 16 }}>{t.rich('who_can_apply.intro', { strong })}</p>
                <ul className={css['detail-list']}>
                  {t.raw('who_can_apply.bullets').map((bullet: string, i: number) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div id="what-you-can-receive" className={cn(css['col'], css['scroll-anchor'])}>
              <h3 className={css['heading-3']}>{t('what_you_can_receive.heading')}</h3>
              <div className={css['body']}>
                <p style={{ marginBottom: 16 }}>{t.rich('what_you_can_receive.intro', { strong })}</p>
                <ul className={css['detail-list']}>
                  {t.raw('what_you_can_receive.bullets').map((bullet: string, i: number) => (
                    <li key={i}>{t.rich(`what_you_can_receive.bullets.${i}`, { strong })}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* What we support tags */}
          <div className={css['support-tags-section']}>
            <p className={css['support-tags-label']}>{t('support_tags.label')}</p>
            <div className={css['support-tags']}>
              {SUPPORT_TAGS.map(tag => (
                <div key={tag.label} className={css['support-tag']} style={{ background: tag.color }}>
                  {tag.label}
                </div>
              ))}
            </div>
          </div>

          {/* Apply now pill + Follow us */}
          <div id="apply" className={cn(css['scroll-anchor'], 'flex flex-col gap-6 md:gap-8 items-center w-full')}>
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="bg-white border border-[#decffb] rounded-3xl md:rounded-full px-4 md:pl-6 md:pr-4 py-4 md:py-3 flex flex-col md:flex-row gap-3 md:gap-4 items-center w-full md:w-auto max-w-full">
                <p className="text-base font-bold text-[#214] leading-6 text-center md:text-left">
                  {t('apply.pill_text')}
                </p>
                <Link to={APPLY_HREF} className={css['btn-primary']}>
                  {t('apply.apply_button')}
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>
              <p className="text-sm text-[#594d73] text-center leading-5 px-4">
                {t.rich('apply.contact_note', { strong })}{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-[#7235ed] hover:underline break-all">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ── Art with Text Overlay ─────────────────────── */}
        <section className={cn(css['art-overlay'], 'expand')}>
          <Image src={HeroBackground} alt="" className={css['art-overlay-bg']} fill sizes="100vw" />
          <div className={cn(css['art-overlay-inner'], 'section')}>
            <div className={css['art-overlay-text']} aria-label={t('art_overlay_aria')}>
              <ArtOverlayText />
            </div>
          </div>
        </section>

        {/* ── Other Support (Discount applications) ─────── */}
        <section className={cn(css['other-support'], 'expand')}>
          <div className={css['other-support-left']}>
            <div className={css['other-support-text']}>
              <p className={css['section-tag']}>{t('other_support.tag')}</p>
              <h3 className={css['heading-3']}>{t('other_support.heading')}</h3>
              <div className={css['body']}>
                <p style={{ marginBottom: 16 }}>{t.rich('other_support.body_intro', { strong })}</p>
                <ul className={css['detail-list']} style={{ marginBottom: 16 }}>
                  {t.raw('other_support.bullets').map((bullet: string, i: number) => (
                    <li key={i}>{t.rich(`other_support.bullets.${i}`, { strong })}</li>
                  ))}
                </ul>
                <p>{t('other_support.body_outro')}</p>
              </div>
            </div>
            <Link to="/tickets" className={css['btn-secondary']}>
              {t('other_support.view_all_tickets')}
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </div>

          <div className={css['other-support-right']}>
            <TicketTable
              title={t('other_support.card_title')}
              subtitle={t('other_support.card_subtitle')}
              rows={APPLICATION_ROWS}
            />

            <div className={css['faq-accordion']}>
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className={css['faq-item']}>
                  <button
                    type="button"
                    className={css['faq-trigger']}
                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                    aria-expanded={openFaqIndex === i}
                  >
                    <span>{item.q}</span>
                    {openFaqIndex === i ? (
                      <ChevronUp size={16} strokeWidth={2} className={css['faq-chevron']} />
                    ) : (
                      <ChevronDown size={16} strokeWidth={2} className={css['faq-chevron']} />
                    )}
                  </button>
                  <div className={cn(css['faq-answer-wrap'], openFaqIndex === i && css['faq-answer-open'])}>
                    <div className={css['faq-answer-inner']}>
                      <div className={css['faq-answer']}>{item.a}</div>
                    </div>
                  </div>
                  {i < FAQ_ITEMS.length - 1 && <div className={css['faq-border']} />}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Page>
  )
}

export async function getStaticProps(context: any) {
  const locale: string = context.locale ?? 'en'
  const messages = await getMessages(locale)
  return { props: { messages } }
}
