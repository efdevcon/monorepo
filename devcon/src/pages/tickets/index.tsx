import React from 'react'
import NextLink from 'next/link'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { BottomFAQ, useStandardFaqItems } from 'components/common/BottomFAQ'
import { EarlyBirdSaleBanner } from 'components/domain/tickets/EarlyBirdSaleBanner'
import { TicketTable, type TicketRow } from 'components/domain/tickets/TicketTable'
import { TicketComparison } from 'components/domain/tickets/TicketComparison'
import { useEthEarlyBirdWave } from 'hooks/useEthEarlyBirdWave'
import { TICKET_WAVES, getFirstWaveDateLabel } from 'config/waves'
import { CountdownText } from 'components/common/CountdownText'
import { getFaqData } from 'services/faq'
import { getMessages } from 'utils/intl'
import themes from '../themes.module.scss'
import HeroBackground from './updated-hero.png'
import ArtOverlayBg from './tickets-art-overlay-bg.png'
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
      className={`inline-flex items-center px-3 py-2.5 rounded text-sm font-bold tracking-[0.5px] leading-none uppercase ${
        status === 'open' ? 'bg-[#aaeaba] text-[#221144]' : 'bg-[#f2f1f4] text-[#221144]'
      }`}
    >
      {status === 'open' ? openLabel : comingLabel}
    </span>
  )
}

// Format a wave opening time as "20 May 02:00 UTC" — mirrors the banner.
const WAVE_TIME_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})
const WAVE_LABELS = ['First wave', 'Second wave', 'Third wave', 'Fourth wave']

// Rich block rendered below the active ETH Early Bird row in the General
// Admission table — countdown next to the two announced opening windows
// (mirrors the layout of the main ETH Early Bird sale banner).
function EthEarlyBirdWaveDetails({ countdown }: { countdown: string }) {
  const times = TICKET_WAVES[0]?.openTimes ?? []
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
      <p className="text-base leading-6">
        Opens in <CountdownText value={countdown} className="font-bold text-[#7235ed] leading-6" />
      </p>
      {times.length > 0 && (
        <div className="flex flex-col gap-0.5 text-xs leading-[14px] text-[#594d73] sm:text-right">
          {times.map((d, i) => (
            <p key={i} className="whitespace-nowrap">
              {WAVE_LABELS[i] ?? `Wave ${i + 1}`} at {WAVE_TIME_FORMATTER.format(d)} UTC
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// Tag rendered on the General Admission overview card. Cycles through three
// states driven by `useEthEarlyBirdWave`:
//   countdown → precise launch date (e.g. "MAY 20") in plain bold text
//   live      → green OPEN tag
//   closed    → gray CLOSED tag
function GeneralAdmissionTag() {
  const wave = useEthEarlyBirdWave()
  if (wave.status === 'live') {
    return (
      <span className="inline-flex items-center px-3 py-2.5 rounded text-sm font-bold tracking-[0.5px] leading-none uppercase bg-[#aaeaba] text-[#221144]">
        OPEN
      </span>
    )
  }
  if (wave.status === 'closed') {
    return (
      <span className="inline-flex items-center px-3 py-2.5 rounded text-sm font-bold tracking-[0.5px] leading-none uppercase bg-[#f2f1f4] text-[#594d73]">
        CLOSED
      </span>
    )
  }
  // 'countdown' (or pre-mount) → show the announced date in a marigold pill,
  // mirroring the pill styling of OPEN / COMING SOON on the other cards.
  const dateLabel = getFirstWaveDateLabel()
  return (
    <span className="inline-flex items-center px-3 py-2.5 rounded text-sm font-bold tracking-[0.5px] leading-none uppercase whitespace-nowrap bg-[#ffa366] text-[#221144]">
      {dateLabel ? `OPENS ${dateLabel.toUpperCase()}` : ''}
    </span>
  )
}

// Student application criteria — shown in expandable row content under both
// "Indian Students" and "International Students" rows in the Applications table.
function StudentCriteria() {
  const t = useTranslations('tickets.criteria.student')
  const bullets = t.raw('bullets') as string[]
  return (
    <>
      <p className="font-bold">{t('heading')}</p>
      <ul className="list-disc pl-5 flex flex-col gap-1.5">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      <p>
        <strong>{t('note_label')}</strong> {t('note')}
      </p>
    </>
  )
}

interface TicketsPageProps {
  faqItems?: Array<{ question: string; answer: string }>
}

export default function TicketsPage({ faqItems }: TicketsPageProps = {}) {
  const t = useTranslations('tickets')
  const resolvedFaqItems = useStandardFaqItems(faqItems)

  const navLinks = [
    { title: t('nav.overview'), to: '#overview' },
    { title: t('nav.general_admission'), to: '#general-admission' },
    { title: t('nav.discounts'), to: '#discounts' },
    { title: t('nav.applications'), to: '#applications' },
    { title: t('nav.faq'), to: '#faq' },
  ]

  const overviewCards = t.raw('overview.cards') as OverviewCard[]
  const tagOpen = t('overview.tag_open')
  const tagComing = t('overview.tag_coming')

  const communityRowsRaw = t.raw('community_section.rows') as TicketRow[]
  const applicationRowsRaw = t.raw('applications_section.rows') as TicketRow[]

  // ETH Early Bird wave state — shared across the site via this hook.
  const wave = useEthEarlyBirdWave()

  // Maps a row name → expandable details JSX. Anything not in the map renders
  // as a normal (non-expandable) row. Easy to add more detail blocks here.
  const detailsByName: Record<string, React.ReactNode> = {
    'Indian Students': <StudentCriteria />,
    'International Students': <StudentCriteria />,
  }
  function withDetails(row: TicketRow): TicketRow {
    const details = detailsByName[row.name]
    return details ? { ...row, details } : row
  }

  // General Admission rows derived from the canonical wave config. Each wave
  // becomes a row; the ETH Early Bird row additionally reflects live state
  // (OPEN tag once live, countdown badge while pending).
  const generalRows: TicketRow[] = TICKET_WAVES.map(w => {
    const row: TicketRow = {
      name: w.name,
      price: w.price,
      action: w.action,
      actionHref: w.actionHref,
      date: w.openLabel,
    }
    if (w.id === 'eth-early-bird') {
      if (wave.status === 'live') {
        row.status = 'open'
      } else if (wave.status === 'countdown' && wave.countdown) {
        // Countdown + announced opening times rendered below the row
        // (mirrors the main ETH Early Bird sale banner).
        row.richContent = <EthEarlyBirdWaveDetails countdown={wave.countdown} />
      }
    }
    return withDetails(row)
  })
  const communityRows: TicketRow[] = communityRowsRaw.map(withDetails)
  const applicationRows: TicketRow[] = applicationRowsRaw.map(withDetails)

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
          {/* ── ETH Early Bird sale banner ───────────────────────── */}
          <EarlyBirdSaleBanner />

          {/* ── Overview ─────────────────────────────────────────── */}
          <section id="overview" className="flex flex-col gap-8 items-center">
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
                // General Admission tag cycles based on the live ETH Early Bird state:
                //   countdown → display the precise public-facing date (e.g. "MAY 20")
                //   live      → green "OPEN" tag
                //   closed    → gray "CLOSED" tag
                const isGeneral = card.title === 'General Admission'
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
                    {isGeneral ? (
                      <GeneralAdmissionTag />
                    ) : (
                      <StatusTag status={card.status} openLabel={tagOpen} comingLabel={tagComing} />
                    )}
                  </div>
                )
              })}
            </div>

            <Link
              to="#general-admission"
              className="inline-flex items-center gap-1.5 pl-4 py-4 text-base font-bold text-[#7235ed] hover:opacity-80 transition-opacity"
            >
              {t('overview.learn_more')}
              <ChevronDown className="w-4 h-4" strokeWidth={2} />
            </Link>
          </section>

          <hr className={css['divider']} />

          {/* ── General Admission ────────────────────────────────── */}
          <section id="general-admission" className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            <div className="flex flex-col gap-6">
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
              </div>
              <NextLink
                href="/tickets/store"
                className="inline-flex items-center justify-center gap-2 w-full md:w-auto md:self-start min-h-9 px-8 py-4 bg-[#7235ed] hover:bg-[#6028cc] transition-colors rounded-full text-base font-bold text-[#f9f8fa] leading-none"
              >
                {t('general_admission.cta')}
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </NextLink>
            </div>

            <TicketTable
              title={t('general_admission.card_title')}
              subtitle={t('general_admission.card_subtitle')}
              rows={generalRows}
              tapLabel={t('general_admission.tap_label')}
            />
          </section>

          <hr className={css['divider']} />

          {/* ── Community ────────────────────────────────────────── */}
          <section id="discounts" className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
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
            </div>

            <TicketTable
              title={t('community_section.card_title')}
              subtitle={t('community_section.card_subtitle')}
              rows={communityRows}
              tapLabel={t('community_section.tap_label')}
            />
          </section>

          <hr className={css['divider']} />

          {/* ── Applications ─────────────────────────────────────── */}
          <section id="applications" className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
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
              <p className="text-sm md:text-base text-[#221144] leading-5 md:leading-6">
                <strong>{t('applications_section.subcopy_strong_1')}</strong>
                {t('applications_section.subcopy_middle_1')}
                <strong>{t('applications_section.subcopy_strong_2')}</strong>
                {t('applications_section.subcopy_middle_2')}
                <strong>{t('applications_section.subcopy_strong_3')}</strong>
                {t('applications_section.subcopy_suffix')}
              </p>
            </div>

            <TicketTable
              title={t('applications_section.card_title')}
              subtitle={t('applications_section.card_subtitle')}
              rows={applicationRows}
              tapLabel={t('applications_section.tap_label')}
            />
          </section>

          <hr className={css['divider']} />

          {/* ── Comparison Table ─────────────────────────────────── */}
          <TicketComparison />
        </div>
      </div>

      {/* ── FAQ (with banner) ─────────────────────────────────── */}
      <section id="faq">
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
