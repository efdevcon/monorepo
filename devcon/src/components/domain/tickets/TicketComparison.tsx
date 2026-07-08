import React, { useState } from 'react'
import NextLink from 'next/link'
import { useTranslations } from 'next-intl'
import { CircleCheckBig, Asterisk, ArrowRight } from 'lucide-react'
import { useFeaturedWave, useWaveStates, useIsLaunched, useTicketsStoreUrl } from 'hooks/useWaveStates'
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
  if (kind === 'check') return <CircleCheckBig className="w-4 h-4 text-[#7235ed] shrink-0" strokeWidth={2} />
  return <Asterisk className="w-4 h-4 text-[#594d73] shrink-0" strokeWidth={2} />
}

const StatusTag = ({ status, openLabel, comingLabel }: { status: 'open' | 'coming'; openLabel: string; comingLabel: string }) => (
  <span
    className={`inline-flex items-center self-start px-2.5 py-1.5 rounded text-xs font-bold tracking-[0.5px] uppercase whitespace-nowrap ${
      status === 'open' ? 'bg-[#80df98] text-[#221144]' : 'bg-[#f2f1f4] text-[#221144]'
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

  // Renders through the same StatusTag as the other columns so all tags
  // share identical typography — only the label varies.
  if (!mounted) {
    return <StatusTag status="coming" openLabel="" comingLabel={' '} />
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
  <NextLink
    href={href}
    className={`inline-flex items-center justify-center gap-2 min-h-9 px-8 py-4 rounded-full text-base font-bold leading-none transition-colors ${
      variant === 'primary'
        ? 'bg-[#7235ed] hover:bg-[#6028cc] text-[#f9f8fa]'
        : 'bg-white/80 hover:bg-white border border-solid border-[rgba(34,17,68,0.1)] text-[#1a0d33]'
    }`}
  >
    {label}
    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
  </NextLink>
)

// Mobile (<lg): single card matching Figma's tab-based comparison layout.
// One card visible at a time; the parent TicketComparison renders tab pills
// above this card and "Swipe to compare tickets" hint below.
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold text-[#594d73] tracking-[0.5px] uppercase leading-4">{children}</p>
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
  <div className="flex flex-col gap-4 bg-white rounded-2xl px-5 py-6 w-full max-w-[520px] shadow-[0_1px_1px_rgba(22,11,43,0.1),0_2px_2px_rgba(22,11,43,0.08),0_4px_8px_rgba(22,11,43,0.12)]">
    <div className="flex flex-col gap-4">
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
        <p className="text-xs text-[#594d73] leading-none">{labels.price_note}</p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">{column.title}</h3>
        <p className="text-xs font-semibold text-[#7235ed] tracking-[1px] uppercase leading-none">{column.subtitle}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <p className="text-xl font-bold text-[#160b2b] leading-none tracking-[-0.5px]">{column.price}</p>
          {column.price_original && (
            <p className="text-sm font-bold text-[#594d73] line-through leading-5">{column.price_original}</p>
          )}
        </div>
        <p className="text-xs text-[#594d73] leading-none">{column.price_note}</p>
        {column.price_description && (
          <p className="text-xs text-[#594d73] leading-4">{column.price_description}</p>
        )}
      </div>
    </div>

    <hr className="border-t border-solid border-[rgba(34,17,68,0.1)]" />

    <div className="flex flex-col gap-2">
      <SectionLabel>{labels.best_for}</SectionLabel>
      <p className="text-sm text-[#160b2b] leading-5">{column.best_for}</p>
    </div>

    <hr className="border-t border-solid border-[rgba(34,17,68,0.1)]" />

    <div className="flex flex-col gap-2">
      <SectionLabel>{labels.included}</SectionLabel>
      {column.included.map((i, idx) => (
        <div key={idx} className="flex gap-2 items-center text-sm text-[#160b2b] leading-5">
          <IncludedIcon kind={i.icon} />
          {i.text}
        </div>
      ))}
    </div>

    <hr className="border-t border-solid border-[rgba(34,17,68,0.1)]" />

    <div className="flex flex-col gap-2">
      <SectionLabel>{labels.how_it_works}</SectionLabel>
      <ul className="flex flex-col gap-2 list-disc pl-5">
        {column.how_it_works.map((step, idx) => (
          <li key={idx} className="text-sm text-[#160b2b] leading-5">
            {step}
          </li>
        ))}
      </ul>
    </div>

    {!column.hide_cta && (
      <NextLink
        href={column.cta_href}
        className={`inline-flex items-center justify-center gap-2 min-h-9 px-8 py-4 rounded-full text-base font-bold leading-none transition-colors w-full ${
          column.cta_variant === 'primary'
            ? 'bg-[#7235ed] hover:bg-[#6028cc] text-[#f9f8fa]'
            : 'bg-white hover:bg-white/90 border border-solid border-[rgba(34,17,68,0.1)] text-[#1a0d33]'
        }`}
      >
        {column.cta_label}
        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
      </NextLink>
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
    className={`w-[149px] shrink-0 px-6 py-4 bg-gradient-to-l from-[#221144] to-[#160b2b] text-[#dddae2] text-xs font-semibold tracking-[0.5px] flex ${
      withTopBorder ? 'border-t border-solid border-white/10' : ''
    } ${alignTop ? 'items-start pt-5' : 'items-center'}`}
  >
    {children}
  </div>
)

export function TicketComparison() {
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
      return {
        ...col,
        status: 'coming',
        coming_label: paused.pausedLabel?.toUpperCase(),
        price: `${ethPrice}+`,
        price_original: undefined,
        price_note: fiatPrice ? `${ethPrice} via ETH • ${fiatPrice} via Fiat` : paused.wave.name,
        price_description: undefined,
        hide_cta: true,
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
    <section id="comparison" className="flex flex-col gap-8 items-center">
      <div className="flex flex-col gap-4 items-center text-center w-full">
        <p className="text-sm font-semibold text-[#7235ed] tracking-[2px] uppercase leading-none">
          {t('eyebrow')}
        </p>
        <h2 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">
          {t('heading')}
        </h2>
        <p className="text-sm sm:text-base text-[#221144] leading-6">{t('subheading')}</p>
      </div>

      {/* Mobile/tablet: tab-switcher + single card */}
      <div className="flex flex-col gap-4 items-center w-full lg:hidden">
        <div className="bg-[#f2f1f4] p-1 rounded-xl flex items-center">
          {columns.map((col, idx) => {
            const isActive = idx === activeTab
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`min-h-8 px-3 py-3 rounded-[10px] text-sm font-medium leading-5 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-white text-[#7235ed] font-bold shadow-[0_1px_3px_rgba(22,11,43,0.1),0_1px_2px_rgba(22,11,43,0.1)]'
                    : 'text-[#594d73]'
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
                <h3 className="text-2xl font-extrabold tracking-[-0.5px] leading-[1.2] text-[#160b2b]">{col.title}</h3>
                <p className="text-xs font-semibold text-[#7235ed] tracking-[1px] uppercase leading-none">{col.subtitle}</p>
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
                <p className="text-xl font-bold text-[#160b2b] leading-none tracking-[-0.5px]">{col.price}</p>
                {col.price_original && (
                  <p className="text-sm font-bold text-[#594d73] line-through leading-5">{col.price_original}</p>
                )}
              </div>
              <p className="text-xs text-[#594d73] leading-none">{col.price_note}</p>
              {col.price_description && (
                <p className="text-xs text-[#594d73] leading-4">{col.price_description}</p>
              )}
            </div>
          ))}
        </div>

        {/* BEST FOR row */}
        <div className="flex items-stretch">
          <RowLabel withTopBorder>{labels.best_for}</RowLabel>
          {columns.map(col => (
            <div
              key={col.id}
              className={`flex-1 min-w-0 flex items-center px-4 py-4 border-t border-l border-solid border-[rgba(34,17,68,0.1)]`}
            >
              <p className="text-sm text-[#160b2b] leading-5">{col.best_for}</p>
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
                  <p className="text-sm text-[#160b2b] leading-none">{item.text}</p>
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
              <ul className="flex flex-col gap-3 list-disc pl-5">
                {col.how_it_works.map((step, idx) => (
                  <li key={idx} className="text-sm text-[#160b2b] leading-none">
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

      <p className="text-sm text-[#594d73] leading-none w-full text-right mt-2">{t('footer_note')}</p>
    </section>
  )
}
