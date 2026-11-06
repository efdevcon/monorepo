import React from 'react'
import NextLink from 'next/link'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { ArrowRight } from 'lucide-react'
import { BottomFAQ, useStandardFaqItems } from 'components/common/BottomFAQ'
import { TicketTable, type TicketRow } from 'components/domain/tickets/TicketTable'
import { TicketComparison } from 'components/domain/tickets/TicketComparison'
import { useIsLaunched, useTicketsStoreUrl } from 'hooks/useWaveStates'
import { useUpiPrices, upiPriceFor, type UpiProduct } from 'hooks/useUpiPrices'
import { TICKETS_WRAPPED } from 'config/waves'
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

interface TicketsPageProps {
  faqItems?: Array<{ question: string; answer: string }>
}

export default function TicketsPage({ faqItems }: TicketsPageProps = {}) {
  const t = useTranslations('tickets')
  const resolvedFaqItems = useStandardFaqItems(faqItems)
  const storeUrl = useTicketsStoreUrl()

  const navLinks = [
    { title: t('nav.discounts'), to: '#discounts' },
    { title: t('nav.applications'), to: '#applications' },
    { title: t('nav.general_admission'), to: '#general-admission' },
    { title: t('nav.faq'), to: '#faq' },
  ]

  // Rows may name a UPI product (`upiProduct` slug); its rupee price comes
  // from Pretix at runtime and lands in the row's RUPEES cell once loaded.
  type ContentRow = TicketRow & { upiProduct?: UpiProduct }
  const communityRowsRaw = t.raw('community_section.rows') as ContentRow[]
  const applicationRowsRaw = t.raw('applications_section.rows') as ContentRow[]
  const upiPrices = useUpiPrices()
  // General Admission daily passes: static rows, always on sale (the store's
  // card carries the quantity picker and Pretix handoff).
  const generalRows = t.raw('general_admission.rows') as TicketRow[]

  // Maps a row name → expandable details JSX. Kept as an empty object so
  // future detail panels can be re-enabled per-row without changing the
  // wiring below. The "tap to learn more" affordance was removed from the
  // Applications section per the latest design — students see criteria
  // on the application form page itself (/form/student-application).
  const detailsByName: Record<string, React.ReactNode> = {}
  function withDetails({ upiProduct, ...row }: ContentRow): TicketRow {
    const details = detailsByName[row.name]
    const priceInr = upiPriceFor(upiPrices, upiProduct) ?? undefined
    return { ...row, priceInr, ...(details ? { details } : {}) }
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
  // Student applications are open regardless of the launch gate.
  const applicationRows: TicketRow[] = applicationRowsRaw.map(withDetails)

  // Post-event (config/waves TICKETS_WRAPPED): every product collapses to a
  // closed audit row — name and prices struck through, "Sale ended" in the
  // status slot, no CTA / countdown / date — whatever the wave logic above
  // decided. Keeps the prices on record without implying anything is buyable.
  const closeRow = (row: TicketRow): TicketRow => ({
    name: row.name,
    price: row.price,
    priceInr: row.priceInr,
    muted: true,
  })
  const finalRows = (rows: TicketRow[]) => (TICKETS_WRAPPED ? rows.map(closeRow) : rows)

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
              {launched && !TICKETS_WRAPPED && (
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
              rows={finalRows(communityRows)}
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
                {t('applications_section.body_suffix')}
              </p>
              {launched && !TICKETS_WRAPPED && (
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
              rows={finalRows(applicationRows)}
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
              {/* Post-event: the daily passes are no longer on sale. */}
              {!TICKETS_WRAPPED && (
                <NextLink
                  href={`${storeUrl}#general-admission`}
                  className="mt-2 inline-flex items-center justify-center gap-2 w-full md:w-auto md:self-start min-h-9 px-8 py-4 bg-[#7235ed] hover:bg-[#6028cc] transition-colors rounded-full text-base font-bold text-[#f9f8fa] leading-none"
                >
                  {t('general_admission.cta')}
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </NextLink>
              )}
            </div>

            <TicketTable
              title={t('general_admission.card_title')}
              subtitle={t('general_admission.card_subtitle')}
              rows={finalRows(generalRows)}
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
