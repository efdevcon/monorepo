import React, { useState } from 'react'
import { Link } from 'components/common/link'
import { useTranslations } from 'next-intl'
import { CircleCheckBig, Asterisk, ArrowRight } from 'lucide-react'
import { useFeaturedWave, useWaveStates, useIsLaunched, useTicketsStoreUrl, useSpecialOffer } from 'hooks/useWaveStates'
import { ctaPrimary, ctaSecondary } from 'components/common/cta'
import { sectionHeading, bodyCopy, eyebrow as eyebrowStyle } from 'components/common/styles'
import { GLOBAL_LAUNCH_TIME } from 'config/waves'

type IconKind = 'check' | 'asterisk'

interface IncludedItem {
  text: string
  icon: IconKind
}

interface Column {
  id: string
  status: 'open' | 'coming'
  title: string
  tab_label?: string
  subtitle: string
  price: string
  price_original?: string
  price_note: string
  // Optional second line under price_note (e.g. "Limited quantity • Purchasable
  // using ETH (L1)" from a wave's description field).
  price_description?: string
  best_for: string
  included: IncludedItem[]
  how_it_works: string[]
  cta_label: string
  cta_href: string
  cta_variant: 'primary' | 'secondary'
  // Per-column override for the "coming" tag text; falls back to the shared
  // labels.tag_coming ("COMING SOON") when unset.
  coming_label?: string
  // When true the JOIN DEVCON row renders no CTA for this column — used for
  // GA / Community before the global launch, when there's nothing to buy yet.
  hide_cta?: boolean
}

const IncludedIcon = ({ kind }: { kind: IconKind }) => {
  if (kind === 'check') return <CircleCheckBig className="w-[16px] h-[16px] text-[#7235ed] shrink-0" strokeWidth={2} />
  return <Asterisk className="w-[16px] h-[16px] text-[#594d73] shrink-0" strokeWidth={2} />
}

// px literals throughout this file: the mobile layout only ever renders <1024
// where the root font-size is 14px (index.scss), so rem utilities would land
// 12.5% under the Figma values.
const StatusTag = ({ status, openLabel, comingLabel }: { status: 'open' | 'coming'; openLabel: string; comingLabel: string }) => (
  <span
    className={`inline-flex items-center self-start px-[10px] py-[8px] rounded-[4px] text-[12px] font-bold tracking-[0.5px] uppercase whitespace-nowrap leading-none ${
      status === 'open' ? 'bg-[#aaeaba] text-[#221144]' : 'bg-[#f2f1f4] text-[#221144]'
    }`}
  >
    {status === 'open' ? openLabel : comingLabel}
  </span>
)

// "JULY" — month-only label for the "OPENS …" tags; the launch banner
// carries the exact date.
const UPCOMING_MONTH_FORMATTER = new Intl.DateTimeFormat('en', {
  month: 'long',
  timeZone: 'UTC',
})

// Tag for the General Admission column that mirrors the overview card's
// GeneralAdmissionTag: green "OPEN" when live, gray "OPENS [date]" while
// counting down, gray pill with the static `openLabel` for an upcoming TBD
// wave, gray "CLOSED" otherwise. Same dimensions as StatusTag so the column
// header height stays consistent.
const GeneralAdmissionStatusTag = () => {
  const { featured, mounted } = useFeaturedWave()
  const waveStates = useWaveStates()
  const offer = useSpecialOffer()

  // Renders through the same StatusTag as the other columns so all tags
  // share identical typography — only the label varies.
  if (!mounted) {
    return <StatusTag status="coming" openLabel="" comingLabel={' '} />
  }
  // Special voucher promo: GA is purchasable via the voucher, so the tag goes
  // green instead of the contradictory gray "REOPENS …" label.
  if (offer.active) {
    return <StatusTag status="open" openLabel="11% OFF" comingLabel="" />
  }
  if (featured?.status === 'live') {
    return <StatusTag status="open" openLabel="OPEN" comingLabel="" />
  }

  let label = 'CLOSED'
  const paused = waveStates.find(s => s.paused)
  if (featured?.status === 'countdown' && featured.upcoming) {
    label = `OPENS ${UPCOMING_MONTH_FORMATTER.format(featured.upcoming).toUpperCase()}`
  } else if (paused?.pausedLabel) {
    // GA sale paused (coming-soon / closed) — show its label ("REOPENS AUG" / "SOLD OUT").
    label = paused.pausedLabel.toUpperCase()
  } else {
    // Fall back to the first upcoming wave with a static `openLabel`, so a
    // wave configured as "Opens June" (TBD without exact openTimes yet)
    // reads as upcoming rather than CLOSED.
    const upcomingTbd = waveStates.find(s => s.status === 'tbd' && s.wave.openLabel)
    if (upcomingTbd?.wave.openLabel) label = upcomingTbd.wave.openLabel.toUpperCase()
  }
  return <StatusTag status="coming" openLabel="" comingLabel={label} />
}

const CtaButton = ({ label, href, variant }: { label: string; href: string; variant: 'primary' | 'secondary' }) => (
  <Link to={href} className={variant === 'primary' ? ctaPrimary : ctaSecondary}>
    {label}
    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
  </Link>
)

// Mobile (<lg): single card matching Figma's tab-based comparison layout.
// One card visible at a time; the parent TicketComparison renders tab pills
// above this card and "Swipe to compare tickets" hint below.
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12px] font-semibold text-[#594d73] tracking-[0.5px] uppercase leading-[16px]">{children}</p>
)

const MobileCard = ({
  column,
  labels,
}: {
  column: Column
  labels: {
    price: string
    price_note: string
    best_for: string
    included: string
    how_it_works: string
    tag_open: string
    tag_coming: string
  }
}) => (
  <div className="flex flex-col gap-[16px] bg-white rounded-[16px] px-[20px] py-[24px] w-full max-w-[520px] shadow-[0_1px_1px_rgba(22,11,43,0.1),0_2px_2px_rgba(22,11,43,0.08),0_4px_8px_rgba(22,11,43,0.12)]">
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-center justify-between">
        {column.id === 'general_admission' ? (
          <GeneralAdmissionStatusTag />
        ) : (
          <StatusTag
            status={column.status}
            openLabel={labels.tag_open}
            comingLabel={column.coming_label ?? labels.tag_coming}
          />
        )}
        <p className="text-[12px] text-[#594d73] leading-none">{labels.price_note}</p>
      </div>

      <div className="flex flex-col gap-[8px]">
        <h3 className="text-[24px] font-extrabold tracking-[-0.5px] leading-[28.8px] text-[#160b2b]">{column.title}</h3>
        <p className="text-[12px] font-semibold text-[#7235ed] tracking-[1px] uppercase leading-none">{column.subtitle}</p>
      </div>

      <div className="flex flex-col gap-[8px]">
        <div className="flex gap-[8px] items-center">
          <p className="text-[20px] font-bold text-[#160b2b] leading-none tracking-[-0.5px]">{column.price}</p>
          {column.price_original && (
            <p className="text-[14px] font-bold text-[#594d73] line-through leading-[20px]">{column.price_original}</p>
          )}
        </div>
        <p className="text-[12px] text-[#594d73] leading-none">{column.price_note}</p>
        {column.price_description && (
          <p className="text-[12px] text-[#594d73] leading-[16px]">{column.price_description}</p>
        )}
      </div>
    </div>

    <hr className="border-t border-solid border-[rgba(34,17,68,0.1)]" />

    <div className="flex flex-col gap-[8px]">
      <SectionLabel>{labels.best_for}</SectionLabel>
      <p className="text-[14px] text-[#160b2b] leading-[20px]">{column.best_for}</p>
    </div>

    <hr className="border-t border-solid border-[rgba(34,17,68,0.1)]" />

    <div className="flex flex-col gap-[8px]">
      <SectionLabel>{labels.included}</SectionLabel>
      {column.included.map((i, idx) => (
        <div key={idx} className="flex gap-[8px] items-center text-[14px] text-[#160b2b] leading-[20px]">
          <IncludedIcon kind={i.icon} />
          {i.text}
        </div>
      ))}
    </div>

    <hr className="border-t border-solid border-[rgba(34,17,68,0.1)]" />

    <div className="flex flex-col gap-[8px]">
      <SectionLabel>{labels.how_it_works}</SectionLabel>
      <ul className="flex flex-col gap-[8px] list-disc pl-[21px]">
        {column.how_it_works.map((step, idx) => (
          <li key={idx} className="text-[14px] text-[#160b2b] leading-[20px]">
            {step}
          </li>
        ))}
      </ul>
    </div>

    {!column.hide_cta && (
      <Link
        to={column.cta_href}
        className={`inline-flex items-center justify-center gap-[8px] min-h-[36px] px-[32px] py-[16px] rounded-full text-[16px] font-bold leading-none transition-colors w-full ${
          column.cta_variant === 'primary'
            ? 'bg-[#7235ed] hover:bg-[#6028cc] text-[#f9f8fa]'
            : 'bg-white hover:bg-white/90 border border-solid border-[rgba(34,17,68,0.1)] text-[#1a0d33]'
        }`}
      >
        {column.cta_label}
        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
      </Link>
    )}
  </div>
)

const RowLabel = ({
  children,
  alignTop,
  withTopBorder,
}: {
  children: React.ReactNode
  alignTop?: boolean
  withTopBorder?: boolean
}) => (
  <div
    className={`w-[149px] shrink-0 px-6 py-4 bg-gradient-to-l from-[#221144] to-[#160b2b] text-[#dddae2] text-[12px] font-semibold tracking-[0.5px] flex ${
      withTopBorder ? 'border-t border-solid border-white/10' : ''
    } ${alignTop ? 'items-start pt-5' : 'items-center'}`}
  >
    {children}
  </div>
)

export function TicketComparison({ eyebrow }: { eyebrow?: string }) {
  const t = useTranslations('tickets.comparison')
  const labels = t.raw('labels') as {
    price: string
    price_note: string
    best_for: string
    included: string
    how_it_works: string
    join_devcon: string
    tag_open: string
    tag_coming: string
    swipe_hint?: string
  }
  const rawColumns = t.raw('columns') as Column[]
  const { featured, mounted } = useFeaturedWave()
  const waveStates = useWaveStates()
  const { launched } = useIsLaunched()
  const storeUrl = useTicketsStoreUrl()
  const offer = useSpecialOffer()

  // Inject live wave state into the General Admission column so the price /
  // status / CTA always reflect the currently-featured wave instead of the
  // static eth-early-bird snapshot baked into translations.
  const columns: Column[] = rawColumns.map(col => {
    // Community self-claiming discounts open at the global ticket launch:
    // "OPENS JUL 14" before (same treatment as General Admission), OPEN
    // during (matches the during-launch Figma where all three columns
    // read OPEN).
    if (col.id === 'community') {
      return launched
        ? { ...col, status: 'open' }
        : {
            ...col,
            coming_label: `OPENS ${UPCOMING_MONTH_FORMATTER.format(GLOBAL_LAUNCH_TIME).toUpperCase()}`,
            hide_cta: true,
          }
    }
    if (col.id !== 'general_admission' || !mounted) return col
    // GA sale paused (coming-soon / closed): keep the wave's price visible, hide
    // the CTA, and let GeneralAdmissionStatusTag render the paused label
    // ("REOPENS AUG" / "SOLD OUT"). Checked before the featured branch since the
    // paused wave is now the featured one.
    const paused = waveStates.find(s => s.paused)
    if (paused) {
      const ethPrice = paused.wave.ethPrice ?? paused.wave.price
      const fiatPrice = paused.wave.fiatPrice
      // Special voucher promo: GA is purchasable via the voucher while the
      // regular sale is paused — show the store CTA like the live state (the
      // status tag reads "11% OFF" via GeneralAdmissionStatusTag; the store's
      // GA card carries the actual redeem deep-link). Otherwise hide the CTA
      // and show the paused label.
      const offerProps = offer.active
        ? { hide_cta: false, cta_label: 'Get tickets', cta_href: storeUrl }
        : { hide_cta: true }
      return {
        ...col,
        status: 'coming',
        coming_label: paused.pausedLabel?.toUpperCase(),
        price: `${ethPrice}+`,
        price_original: undefined,
        price_note: fiatPrice ? `${ethPrice} via ETH • ${fiatPrice} via Fiat` : paused.wave.name,
        price_description: undefined,
        ...offerProps,
      }
    }
    if (!featured) {
      // No featured wave and not paused — sale has ended across the board.
      return {
        ...col,
        status: 'coming',
        price_original: undefined,
        price_note: 'First round sale ended',
        cta_label: 'View tickets',
        cta_href: storeUrl,
      }
    }
    const isLive = featured.status === 'live'
    // Per Figma the GA price cell reads "$499+" with a sublabel breaking
    // down the ETH vs Fiat cost ("$499 via ETH • $999 via Fiat"), derived
    // from the featured wave so the comparison always tracks the current
    // sale wave. The "+" signals later waves open at a higher price.
    const ethPrice = featured.wave.ethPrice ?? featured.wave.price
    const fiatPrice = featured.wave.fiatPrice
    return {
      ...col,
      status: isLive ? 'open' : 'coming',
      price: `${ethPrice}+`,
      price_original: undefined,
      price_note: fiatPrice ? `${ethPrice} via ETH • ${fiatPrice} via Fiat` : featured.wave.name,
      price_description: undefined,
      cta_label: isLive ? 'Get tickets' : 'View tickets',
      cta_href: storeUrl,
      hide_cta: !launched,
    }
  })

  const [activeTab, setActiveTab] = useState(0)

  return (
    <section id="comparison" className="flex flex-col gap-[24px] sm:gap-[32px] items-center">
      <div className="flex flex-col gap-[16px] items-center text-center w-full">
        <p className={eyebrowStyle}>{eyebrow ?? t('eyebrow')}</p>
        <h2 className={sectionHeading}>{t('heading')}</h2>
        <p className={`${bodyCopy} text-[#1a0d33]`}>{t('subheading')}</p>
      </div>

      {/* Mobile/tablet: tab-switcher + single card (Figma 4920:99499 / 4920:99501) */}
      <div className="flex flex-col gap-[24px] items-center w-full lg:hidden">
        <div className="bg-[#f2f1f4] p-[4px] rounded-[12px] flex items-center shadow-[inset_0_1px_1px_rgba(34,17,68,0.15),inset_0_2px_4px_rgba(34,17,68,0.06)]">
          {columns.map((col, idx) => {
            const isActive = idx === activeTab
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`min-h-[32px] p-[12px] rounded-[8px] text-[14px] leading-[20px] whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-white text-[#7235ed] font-bold shadow-[0_1px_3px_rgba(22,11,43,0.1),0_1px_2px_rgba(22,11,43,0.1)]'
                    : 'text-[#594d73] font-medium'
                }`}
              >
                {col.tab_label || col.title}
              </button>
            )
          })}
        </div>

        <MobileCard column={columns[activeTab]} labels={labels} />
      </div>

      {/* Desktop: comparison grid */}
      <div className="hidden lg:flex flex-col w-full bg-white rounded-2xl border border-solid border-[rgba(34,17,68,0.1)] overflow-hidden shadow-[0_10px_15px_-3px_rgba(22,11,43,0.1),0_4px_6px_-4px_rgba(22,11,43,0.1)]">
        {/* Header row */}
        <div className="flex items-stretch">
          <RowLabel> </RowLabel>
          {columns.map(col => (
            <div
              key={col.id}
              className="flex-1 min-w-0 flex flex-col gap-3 px-4 py-4 border-l border-solid border-[rgba(34,17,68,0.1)]"
            >
              {col.id === 'general_admission' ? (
                <GeneralAdmissionStatusTag />
              ) : (
                <StatusTag
                  status={col.status}
                  openLabel={labels.tag_open}
                  comingLabel={col.coming_label ?? labels.tag_coming}
                />
              )}
              <div className="flex flex-col gap-2">
                <h3 className="text-[24px] font-extrabold tracking-[-0.5px] leading-[28.8px] text-[#160b2b]">{col.title}</h3>
                <p className="text-[12px] font-semibold text-[#7235ed] tracking-[1px] uppercase leading-none">{col.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* PRICE row */}
        <div className="flex items-stretch">
          <RowLabel withTopBorder>
            <div className="flex flex-col gap-2">
              <span>{labels.price}</span>
              <span className="text-[#aca6b9] font-normal tracking-normal">{labels.price_note}</span>
            </div>
          </RowLabel>
          {columns.map(col => (
            <div
              key={col.id}
              className={`flex-1 min-w-0 flex flex-col gap-2 px-4 py-4 border-t border-l border-solid border-[rgba(34,17,68,0.1)]`}
            >
              <div className="flex gap-2 items-end">
                <p className="text-[20px] font-bold text-[#160b2b] leading-none tracking-[-0.5px]">{col.price}</p>
                {col.price_original && (
                  <p className="text-[14px] font-bold text-[#594d73] line-through leading-[20px]">{col.price_original}</p>
                )}
              </div>
              <p className="text-[12px] text-[#594d73] leading-none">{col.price_note}</p>
              {col.price_description && (
                <p className="text-[12px] text-[#594d73] leading-[16px]">{col.price_description}</p>
              )}
            </div>
          ))}
        </div>

        {/* BEST FOR row */}
        <div className="flex items-stretch">
          <RowLabel alignTop withTopBorder>{labels.best_for}</RowLabel>
          {columns.map(col => (
            <div
              key={col.id}
              className={`flex-1 min-w-0 flex items-start px-4 py-4 border-t border-l border-solid border-[rgba(34,17,68,0.1)]`}
            >
              <p className="text-[14px] text-[#160b2b] leading-[20px]">{col.best_for}</p>
            </div>
          ))}
        </div>

        {/* INCLUDED row */}
        <div className="flex items-stretch">
          <RowLabel alignTop withTopBorder>{labels.included}</RowLabel>
          {columns.map(col => (
            <div
              key={col.id}
              className={`flex-1 min-w-0 flex flex-col gap-3 px-4 py-4 border-t border-l border-solid border-[rgba(34,17,68,0.1)]`}
            >
              {col.included.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <IncludedIcon kind={item.icon} />
                  <p className="text-[14px] text-[#160b2b] leading-none">{item.text}</p>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* HOW IT WORKS row */}
        <div className="flex items-stretch">
          <RowLabel alignTop withTopBorder>{labels.how_it_works}</RowLabel>
          {columns.map(col => (
            <div
              key={col.id}
              className={`flex-1 min-w-0 flex flex-col gap-3 px-4 py-4 border-t border-l border-solid border-[rgba(34,17,68,0.1)]`}
            >
              <ul className="flex flex-col gap-3 list-disc pl-[21px]">
                {col.how_it_works.map((step, idx) => (
                  <li key={idx} className="text-[14px] text-[#160b2b] leading-[1.3]">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* JOIN DEVCON row */}
        <div className="flex items-stretch">
          <RowLabel withTopBorder>{labels.join_devcon}</RowLabel>
          {columns.map(col => (
            <div
              key={col.id}
              className={`flex-1 min-w-0 flex items-center px-4 py-4 border-t border-l border-solid border-[rgba(34,17,68,0.1)]`}
            >
              {!col.hide_cta && <CtaButton label={col.cta_label} href={col.cta_href} variant={col.cta_variant} />}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[14px] text-[#594d73] leading-none w-full text-center lg:text-right mt-2">{t('footer_note')}</p>
    </section>
  )
}
