import React, { useState } from 'react'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import themes from '../themes.module.scss'
import HeroBackground from './hero-bg.png'
import JaaliPattern from 'assets/images/pages/ecosystem-jaali-left.svg'
import JaaliBottom from 'assets/images/pages/ecosystem-jaali-bottom.svg'
import CommunityBannerBg from './community-banner.png'
import ArtOverlayText from 'assets/images/pages/ecosystem-art-overlay-text.svg'
import Photo1 from './photo-1.png'
import Photo2 from './photo-2.png'
import Photo3 from './photo-3.png'
import Photo4 from './photo-4.png'
import Photo5 from './photo-5.png'
import Photo6 from './photo-6.png'
import css from './ecosystem-program.module.scss'
import cn from 'classnames'
import { useTranslations } from 'next-intl'

const SCROLLER_PHOTOS = [Photo1, Photo2, Photo3, Photo4, Photo5, Photo6]

const SUPPORT_TAG_COLORS = ['#ffe0cc', '#f0d7f4', '#d6d5f6', '#cddff4', '#cdf4d7']

export default function EcosystemProgramPage() {
  const t = useTranslations('ecosystem_program')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const navLinks = [
    { title: t('nav.about'), to: '#about' },
    { title: t('nav.ecosystem_needs'), to: '#ecosystem-needs' },
    { title: t('nav.who_can_apply'), to: '#who-can-apply' },
    { title: t('nav.what_you_can_receive'), to: '#what-you-can-receive' },
    { title: t('nav.apply'), to: '#apply' },
  ]

  const ecosystemBullets = t.raw('ecosystem_needs.bullets') as Array<{ strong: string; rest: string }>
  const supportTagItems = t.raw('support_tags.items') as string[]
  const whoCanApplyFormats = t.raw('who_can_apply.intro_formats') as string[]
  const whoCanApplyBullets = t.raw('who_can_apply.bullets') as Array<{ prefix?: string; strong: string; suffix?: string; rest?: string }>
  const receiveBullets = t.raw('what_you_can_receive.bullets') as Array<string | { prefix: string; strong: string; suffix: string }>
  const otherSupportBullets = t.raw('other_support.bullets') as Array<{ prefix: string; strong: string; suffix: string }>
  const applicationRows = t.raw('other_support.rows') as Array<{ name: string; price: string; date: string }>
  const faqItems = t.raw('other_support.faq') as Array<{ q: string; a: string }>

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <PageHero
        className={`${css['hero-no-side-gradient']} !mb-0`}
        titleClassName={css['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title={t('title')}
        navigation={navLinks}
      />

      <div className={cn(css['landing'], 'section')}>
        {/* ── Hero Content Section ─────────────────────────────── */}
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
              {t('hero.heading_line_1')}
              <br />
              {t('hero.heading_line_2')}
            </h2>
            <p className={css['body']}>{t('hero.body')}</p>
          </div>

          <div className={css['hero-cta-block']}>
            <Link to="https://esp.ethereum.foundation/applicants/rfp/rtd8_india" className={css['btn-primary']}>
              {t('hero.apply_button')}
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
            <div className={css['hero-deadline']}>
              <span>{t('hero.deadline_label')}</span>
              <strong>{t('hero.deadline_date')}</strong>
            </div>
          </div>
        </section>

        {/* ── Community Message Banner ──────────────────────────── */}
        <section className={cn(css['community-banner'], 'expand')}>
          <Image src={CommunityBannerBg} alt="" className={css['community-banner-bg']} fill sizes="100vw" />
          <p className={css['community-banner-text']}>
            {t('community_banner.prefix')}
            <strong>{t('community_banner.for_strong')}</strong>
            {t('community_banner.middle')}
            <strong>{t('community_banner.by_strong')}</strong>
            {t('community_banner.suffix')}
            <br className={css['desktop-br']} /> {t('community_banner.cta_prefix')}
            <strong>{t('community_banner.together_strong')}</strong>
            {t('community_banner.cta_suffix')}
          </p>
        </section>

        {/* ── Overview Section ──────────────────────────────────── */}
        <section id="ecosystem-needs" className={cn(css['overview-section'], css['scroll-anchor'])}>
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

          {/* What the Ecosystem needs */}
          <div className={css['text-section']}>
            <h3 className={css['heading-3']}>{t('ecosystem_needs.heading')}</h3>
            <div className={css['body-block']}>
              <p className={css['body']}>{t('ecosystem_needs.intro')}</p>
              <ul className={css['bullet-list']}>
                {ecosystemBullets.map((b, i) => (
                  <li key={i}>
                    <strong>{b.strong}</strong>
                    {b.rest}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Who we support tags */}
          <div className={css['support-tags-section']}>
            <p className={css['support-tags-label']}>{t('support_tags.label')}</p>
            <div className={css['support-tags']}>
              {supportTagItems.map((label, i) => (
                <div key={label} className={css['support-tag']} style={{ background: SUPPORT_TAG_COLORS[i] }}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Who can apply / What you can receive */}
          <div id="who-can-apply" className={cn(css['two-col'], css['scroll-anchor'])}>
            <div className={css['col']}>
              <h3 className={css['heading-3']}>{t('who_can_apply.heading')}</h3>
              <div className={css['body']}>
                <p style={{ marginBottom: 16 }}>
                  {t('who_can_apply.intro_prefix')}
                  {whoCanApplyFormats.map((fmt, i) => (
                    <React.Fragment key={i}>
                      <strong>{fmt}</strong>
                      {i < whoCanApplyFormats.length - 1 ? ', ' : ''}
                    </React.Fragment>
                  ))}
                  {t('who_can_apply.intro_suffix')}
                </p>
                <ul className={css['detail-list']}>
                  {whoCanApplyBullets.map((b, i) => (
                    <li key={i}>
                      {b.prefix}
                      <strong>{b.strong}</strong>
                      {b.suffix ?? b.rest ?? ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div id="what-you-can-receive" className={cn(css['col'], css['scroll-anchor'])}>
              <h3 className={css['heading-3']}>{t('what_you_can_receive.heading')}</h3>
              <div className={css['body']}>
                <p style={{ marginBottom: 16 }}>
                  <strong>{t('what_you_can_receive.intro_strong')}</strong>
                </p>
                <ul className={css['detail-list']}>
                  {receiveBullets.map((b, i) => (
                    <li key={i}>
                      {typeof b === 'string' ? (
                        b
                      ) : (
                        <>
                          {b.prefix}
                          <strong>{b.strong}</strong>
                          {b.suffix}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Budget Note + CTA */}
          <div id="apply" className={cn(css['budget-note'], css['scroll-anchor'])}>
            <p className={css['body-small']}>
              <strong>{t('budget_note.note_strong')}</strong>
              {t('budget_note.note_body')}
            </p>

            <div className={css['wave-cta-row']}>
              <div className={css['wave-cta-info']}>
                <span>{t('budget_note.wave_label')}</span>
                <span className={css['wave-cta-date']}>{t('budget_note.wave_date')}</span>
              </div>
              <Link to="https://esp.ethereum.foundation/applicants/rfp/rtd8_india" className={css['btn-primary']}>
                {t('budget_note.apply_button')}
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>

            <p className={css['budget-note-footer']}>
              {t('budget_note.footer_prefix')}
              <strong>{t('budget_note.footer_strong')}</strong>.
              <br />
              {t('budget_note.footer_contact')} <a href="mailto:ecosystem@devcon.org">ecosystem@devcon.org</a>
            </p>
          </div>
        </section>

        {/* ── Art with Text Overlay ─────────────────────────────── */}
        <section className={cn(css['art-overlay'], 'expand')}>
          <Image src={HeroBackground} alt="" className={css['art-overlay-bg']} fill sizes="100vw" />
          <div className={cn(css['art-overlay-inner'], 'section')}>
            <div className={css['art-overlay-text']} aria-label={t('art_overlay_aria')}>
              <ArtOverlayText />
            </div>
          </div>
        </section>

        {/* ── Other Support Section ─────────────────────────────── */}
        <section className={cn(css['other-support'], 'expand')}>
          <div className={css['other-support-left']}>
            <div className={css['other-support-text']}>
              <p className={css['section-tag']}>{t('other_support.tag')}</p>
              <h3 className={css['heading-3']}>{t('other_support.heading')}</h3>
              <div className={css['body']}>
                <p style={{ marginBottom: 16 }}>
                  {t('other_support.body_intro_prefix')}
                  <strong>{t('other_support.body_intro_strong')}</strong>
                  {t('other_support.body_intro_suffix')}
                </p>
                <ul className={css['detail-list']} style={{ marginBottom: 16 }}>
                  {otherSupportBullets.map((b, i) => (
                    <li key={i}>
                      {b.prefix}
                      <strong>{b.strong}</strong>
                      {b.suffix}
                    </li>
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
            <div className={css['ticket-type-card']}>
              <div className={css['ticket-type-header']}>
                <span className={css['ticket-type-title']}>{t('other_support.card_title')}</span>
                <span className={css['ticket-type-status']}>{t('other_support.card_status')}</span>
              </div>
              <div className={css['ticket-type-rows']}>
                {applicationRows.map(row => (
                  <div key={row.name} className={css['ticket-type-row']}>
                    <span className={css['row-name']}>{row.name}</span>
                    <div className={css['row-meta']}>
                      <span className={css['row-price']}>{row.price}</span>
                      <span className={css['row-date']}>{row.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={css['faq-accordion']}>
              {faqItems.map((item, i) => (
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
                  {i < faqItems.length - 1 && <div className={css['faq-border']} />}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Page>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}
