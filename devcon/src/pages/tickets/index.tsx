import React from 'react'
import NextLink from 'next/link'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { BottomFAQ, useStandardFaqItems } from 'components/common/BottomFAQ'
import { TicketTable, type TicketRow } from 'components/domain/tickets/TicketTable'
import { TicketComparison } from 'components/domain/tickets/TicketComparison'
import { useIsLaunched, useTicketsStoreUrl } from 'hooks/useWaveStates'
import { GLOBAL_LAUNCH_TIME } from 'config/waves'
import { getFaqData } from 'services/faq'
import { getMessages } from 'utils/intl'
import themes from '../themes.module.scss'
import Image from 'next/image'
import HeroBackground from './updated-hero.png'
import ArtOverlayBg from './tickets-art-overlay-bg.png'
import ComparisonGlyphWatermark from './comparison-glyph-watermark.png'
import css from './tickets-landing.module.scss'
import cn from 'classnames'
import { useTranslations } from 'next-intl'

const TICKETS_FAQ_CATEGORIES = ['Tickets & availability', 'Pricing & discounts']
const TICKETS_FAQ_PER_CATEGORY = 4

interface OverviewCard {
  title: string
  subtitle: string
  status: 'open' | 'coming'
}

function StatusTag({
  status,
  openLabel,
  comingLabel,
}: {
  status: 'open' | 'coming'
  openLabel: string
  comingLabel: string
}) {
  return (
    <span
      className={`inline-flex items-center px-3 py-2.5 rounded text-sm font-bold tracking-[0.5px] leading-none uppercase whitespace-nowrap ${
        status === 'open' ? 'bg-[#80df98] text-[#221144]' : 'bg-[#f2f1f4] text-[#221144]'
      }`}
    >
      {status === 'open' ? openLabel : comingLabel}
    </span>
  )
}

// Format the global launch time as "JULY" (month only, uppercase, UTC) for
// the Community card's pre-launch "OPENS …" tag.
function formatUpcomingMonth(d: Date): string {
  return new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(d).toUpperCase()
}

interface TicketsPageProps {
  faqItems?: Array<{ question: string; answer: string }>
}

export default function TicketsPage({ faqItems }: TicketsPageProps = {}) {
  const t = useTranslations('tickets')
  const resolvedFaqItems = useStandardFaqItems(faqItems)
  const storeUrl = useTicketsStoreUrl()

  const navLinks = [
    { title: t('nav.overview'), to: '#overview' },
    { title: t('nav.discounts'), to: '#discounts' },
    { title: t('nav.applications'), to: '#applications' },
    { title: t('nav.general_admission'), to: '#general-admission' },
    { title: t('nav.faq'), to: '#faq' },
  ]

  const overviewCards = t.raw('overview.cards') as OverviewCard[]
  const tagOpen = t('overview.tag_open')
  const tagComing = t('overview.tag_coming')

  const communityRowsRaw = t.raw('community_section.rows') as TicketRow[]
  const applicationRowsRaw = t.raw('applications_section.rows') as TicketRow[]
  // General Admission daily passes: static rows, always on sale (the store's
  // card carries the quantity picker and Pretix handoff).
  const generalRows = t.raw('general_admission.rows') as TicketRow[]

  // Maps a row name → expandable details JSX. Kept as an empty object so
  // future detail panels can be re-enabled per-row without changing the
  // wiring below. The "tap to learn more" affordance was removed from the
  // Applications section per the latest design — students see criteria
  // on the application form page itself (/form/student-application).
  const detailsByName: Record<string, React.ReactNode> = {}
  function withDetails(row: TicketRow): TicketRow {
    const details = detailsByName[row.name]
    return details ? { ...row, details } : row
  }

  // Community self-claiming discounts open at the global ticket launch.
  // Before launch their rows show the launch date instead of "Get started"
  // (and the overview card / comparison column read COMING SOON); from the
  // launch moment they flip to their live CTAs, matching the during-launch
  // Figma where every Community row is claimable.
  const { launched } = useIsLaunched()
  const communityRows: TicketRow[] = communityRowsRaw.map(row => {
    const r = withDetails(row)
    if (launched) return r
    return { ...r, action: undefined, actionHref: undefined, date: t('community_section.pre_launch_status') }
  })
  // Sanctuary Tech Builders applications also open at the global launch
  // (student applications are already open). Identified by its form href
  // since row names are translated.
  const applicationRows: TicketRow[] = applicationRowsRaw.map(row => {
    const r = withDetails(row)
    if (!launched && r.actionHref?.includes('builder-application')) {
      return { ...r, action: undefined, actionHref: undefined, date: t('applications_section.pre_launch_status') }
    }
    return r
  })

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
        <div className="flex flex-col gap-12 md:gap-16">
          {/* ── Overview ─────────────────────────────────────────── */}
          <section id="overview" className="scroll-mt-36 flex flex-col gap-8 items-center">
            <div className="flex flex-col gap-4 items-center text-center w-full">
              <p className="text-sm font-semibold text-[#7235ed] tracking-[2px] uppercase leading-none">
                {t('overview.eyebrow')}
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">
                {t('overview.heading')}
              </h2>
              <p className="text-sm sm:text-base text-[#221144] leading-6">{t('overview.subheading')}</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 w-full">
              {overviewCards.map((card, i) => {
                // The translated cards array has a fixed order across locales
                // (Community, Applications, General Admission) — identify by
                // index since titles are translated. Community opens at the
                // global ticket launch, so its static "coming" status flips to
                // open once launched; the other two carry a static status.
                const isCommunity = i === 0
                const cardStatus = isCommunity && launched ? 'open' : card.status
                // Community's pre-launch tag names the launch date ("OPENS
                // JULY") instead of the generic COMING SOON label.
                const comingLabel = isCommunity ? `OPENS ${formatUpcomingMonth(GLOBAL_LAUNCH_TIME)}` : tagComing
                return (
                  <div key={i} className="flex-1 flex items-center gap-2 bg-white rounded-2xl px-6 py-8 min-w-0">
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <p className="text-xl font-bold text-[#160b2b] leading-[28.8px] tracking-[-0.5px]">
                        {card.title}
                      </p>
                      <p className="text-xs font-bold text-[#594d73] tracking-[0.25px] uppercase leading-4">
                        {card.subtitle}
                      </p>
                    </div>
                    <StatusTag status={cardStatus} openLabel={tagOpen} comingLabel={comingLabel} />
                  </div>
                )
              })}
            </div>

            <Link
              to="#discounts"
              className="inline-flex items-center gap-1.5 pl-4 py-4 text-base font-bold text-[#7235ed] hover:opacity-80 transition-opacity"
            >
              {t('overview.learn_more')}
              <ChevronDown className="w-4 h-4" strokeWidth={2} />
            </Link>
          </section>

          <hr className={css['divider']} />

          {/* ── Community ────────────────────────────────────────── */}
          <section id="discounts" className="scroll-mt-36 grid grid-cols-1 min-[1440px]:grid-cols-2 gap-8 min-[1440px]:gap-16 items-start">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-[#7235ed] tracking-[2px] uppercase leading-none">
                {t('community_section.eyebrow')}
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">
                {t('community_section.heading')}
              </h2>
              <p className="text-base md:text-[18px] text-[#1a0d33] leading-[1.5] tracking-[-0.25px]">
                {t('community_section.body_prefix')}
                <strong>{t('community_section.body_strong_1')}</strong>
                {t('community_section.body_middle')}
                <strong>{t('community_section.body_strong_2')}</strong>
                {t('community_section.body_suffix')}
              </p>
              <p className="text-sm md:text-base text-[#221144] leading-5 md:leading-6">
                {t('community_section.subcopy_prefix')}
                <strong>{t('community_section.subcopy_strong_1')}</strong>
                {t('community_section.subcopy_and')}
                <strong>{t('community_section.subcopy_strong_2')}</strong>
                {t('community_section.subcopy_suffix')}
              </p>
              {/* Store CTA only appears once the global launch has opened
                  the Community discounts — before that the section has no
                  actionable destination. */}
              {launched && (
                <NextLink
                  href={storeUrl}
                  className="mt-2 inline-flex items-center justify-center gap-2 w-full md:w-auto md:self-start min-h-9 px-8 py-4 bg-white/80 hover:bg-white border border-solid border-[rgba(34,17,68,0.1)] transition-colors rounded-full text-base font-bold text-[#1a0d33] leading-none"
                >
                  {t('community_section.cta')}
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </NextLink>
              )}
            </div>

            <TicketTable
              title={t('community_section.card_title')}
              subtitle={t('community_section.card_subtitle')}
              rows={communityRows}
            />
          </section>

          <hr className={css['divider']} />

          {/* ── Applications ─────────────────────────────────────── */}
          <section
            id="applications"
            className="scroll-mt-36 grid grid-cols-1 min-[1440px]:grid-cols-2 gap-8 min-[1440px]:gap-16 items-start"
          >
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-[#7235ed] tracking-[2px] uppercase leading-none">
                {t('applications_section.eyebrow')}
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">
                {t('applications_section.heading')}
              </h2>
              <p className="text-base md:text-[18px] text-[#1a0d33] leading-[1.5] tracking-[-0.25px]">
                {t('applications_section.body_prefix')}
                <strong>{t('applications_section.body_strong_1')}</strong>
                {t('applications_section.body_amp')}
                <strong>{t('applications_section.body_strong_2')}</strong>
                {t('applications_section.body_middle')}
                <strong>{t('applications_section.body_strong_3')}</strong>
                {t('applications_section.body_suffix')}
              </p>
              {launched && (
                <NextLink
                  href={storeUrl}
                  className="mt-2 inline-flex items-center justify-center gap-2 w-full md:w-auto md:self-start min-h-9 px-8 py-4 bg-white/80 hover:bg-white border border-solid border-[rgba(34,17,68,0.1)] transition-colors rounded-full text-base font-bold text-[#1a0d33] leading-none"
                >
                  {t('applications_section.cta')}
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </NextLink>
              )}
            </div>

            <TicketTable
              title={t('applications_section.card_title')}
              subtitle={t('applications_section.card_subtitle')}
              rows={applicationRows}
            />
          </section>

          <hr className={css['divider']} />

          {/* ── General Admission (daily passes) ─────────────────── */}
          <section
            id="general-admission"
            className="scroll-mt-36 grid grid-cols-1 min-[1440px]:grid-cols-2 gap-8 min-[1440px]:gap-16 items-start"
          >
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-[#7235ed] tracking-[2px] uppercase leading-none">
                {t('general_admission.eyebrow')}
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">
                {t('general_admission.heading')}
              </h2>
              <p className="text-base md:text-[18px] text-[#1a0d33] leading-[1.5] tracking-[-0.25px]">
                <strong>{t('general_admission.body_strong')}</strong>
                {t('general_admission.body')}
              </p>
              <p className="text-sm md:text-base text-[#221144] leading-5 md:leading-6">
                <strong>{t('general_admission.subcopy_strong')}</strong>
                {t('general_admission.subcopy')}
              </p>
              <NextLink
                href={`${storeUrl}#general-admission`}
                className="mt-2 inline-flex items-center justify-center gap-2 w-full md:w-auto md:self-start min-h-9 px-8 py-4 bg-[#7235ed] hover:bg-[#6028cc] transition-colors rounded-full text-base font-bold text-[#f9f8fa] leading-none"
              >
                {t('general_admission.cta')}
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </NextLink>
            </div>

            <TicketTable
              title={t('general_admission.card_title')}
              subtitle={t('general_admission.card_subtitle')}
              rows={generalRows}
            />
          </section>

          <hr className={css['divider']} />

          {/* ── Comparison Table ─────────────────────────────────── */}
          {/* `isolate` keeps the watermark/comparison stacking contained to
              this section so the inner z-indexes don't fight the sticky page
              nav; `pb-16` gives the card + disclaimer breathing room above
              the FAQ band that follows. */}
          <div className="relative isolate pb-16">
            {/* Decorative glyph at the bottom of the page content area,
                behind the comparison card. */}
            <Image
              src={ComparisonGlyphWatermark}
              alt=""
              aria-hidden
              priority={false}
              className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-auto w-full select-none"
            />
            <div className="relative z-10">
              <TicketComparison />
            </div>
          </div>
        </div>
      </div>

      {/* ── FAQ (with banner) ─────────────────────────────────── */}
      <section id="faq" className="scroll-mt-36">
        <BottomFAQ
          heading={t('faq_section.heading')}
          items={resolvedFaqItems}
          viewAllLabel={t('faq_section.view_all')}
          viewAllHref="/tickets/faq"
          banner={ArtOverlayBg}
        />
      </section>
    </Page>
  )
}

export async function getStaticProps(context: any) {
  const locale: string = context.locale ?? 'en'
  const messages = await getMessages(locale)

  let faqItems: Array<{ question: string; answer: string }> = []
  try {
    const data = await getFaqData(locale)
    faqItems = TICKETS_FAQ_CATEGORIES.flatMap(category =>
      data.items
        .filter(i => i.category === category && i.answer.trim() !== '')
        .slice(0, TICKETS_FAQ_PER_CATEGORY)
        .map(i => ({ question: i.question, answer: i.answer }))
    )
  } catch {
    // Fall back to empty list — TicketsPage renders translated fallback instead
  }

  return {
    props: { faqItems, messages },
    revalidate: 3600, // 1 hour
  }
}
