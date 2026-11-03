import React, { useState } from 'react'
import NextLink from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CountdownText } from 'components/common/CountdownText'

export interface TicketRow {
  name: string
  detail?: string
  status?: 'open' | 'coming'
  // Price shown in the PRICE column (e.g. "$999"). `FREE` renders in a green
  // chip so no-cost tiers stand out. Absent → cell blank.
  price?: string
  date?: string
  action?: string
  actionHref?: string
  // Countdown text rendered in the action slot (purple, right-aligned). Used
  // for the featured-but-not-yet-live wave: the countdown sits where the
  // "Get tickets" button would be once the wave opens.
  actionCountdown?: string
  // Small annotation rendered directly beneath the action/status slot inside
  // the STATUS column (e.g. "11% off until Aug 11" under "Get tickets").
  // Unlike `richContent` it lives inside the main row, so the PRICE column
  // background stretches to cover it.
  actionNote?: React.ReactNode
  // Expandable content rendered below the row when the user clicks it.
  // Setting this makes the entire row clickable to toggle expansion; the
  // action link (if any) stops propagation so it still navigates normally.
  details?: React.ReactNode
  // Optional rich block rendered BELOW the main row content (always visible).
  // Used to surface live information like a countdown + opening times for
  // the active wave. Adds vertical height to the row.
  richContent?: React.ReactNode
  // When true the row is rendered de-emphasized (e.g. a past/closed wave).
  muted?: boolean
  // Like `muted` but WITHOUT the strikethrough — a future/TBA tier (e.g. Final
  // Waves): name + price render in the muted purple foreground.
  dimmed?: boolean
}

interface TicketTableProps {
  title: string
  subtitle: string
  rows: TicketRow[]
  tapLabel?: string
}

/**
 * TicketTable — the "Ticket-Type-Container" card from the Devcon Figma
 * design (nodes 5160:9160 / 5136:4473 / 5141:8075).
 *
 * Layout: dark gradient header, gray column-header row, then a stack of
 * data rows with 3 columns:
 *
 *   PRODUCT (flex, left)  |  PRICE ($X)  |  STATUS (CTA)
 *
 * Responsive behavior:
 *   - desktop (≥sm): true 3-column table row per item
 *   - mobile (<sm): PRODUCT stacks above; PRICE + STATUS wrap onto a
 *     single line below (per Figma mobile spec)
 *
 * Rows may also be expandable (click to toggle `details` panel below) —
 * inherited from the previous implementation.
 */
export function TicketTable({ title, subtitle, rows, tapLabel }: TicketTableProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  return (
    <div className="bg-white border border-solid border-[rgba(34,17,68,0.1)] rounded-2xl overflow-hidden shadow-[0_1px_2px_0_rgba(22,11,43,0.1),0_2px_4px_0_rgba(22,11,43,0.08),0_4px_16px_0_rgba(22,11,43,0.12)] w-full">
      {/* Dark gradient header (Figma: dark purple bg, section name + "INCL. 18% GST") */}
      <div className="flex items-center justify-between gap-4 px-6 py-6 bg-gradient-to-r from-[#221144] via-[#2e1b58] to-[#221144]">
        <p className="text-xl font-bold text-[#f9f8fa] tracking-[-0.5px] leading-[1.1]">{title}</p>
        <p className="text-xs font-semibold text-[#dddae2] tracking-[0.25px] uppercase whitespace-nowrap">{subtitle}</p>
      </div>

      {/* Column-header row — visible at md+ (≥768px). Below md the
          multi-column layout stops making sense (product name gets
          starved), so we switch to a stacked per-row layout that
          matches the Figma mobile spec.

          `gap-3` here matches the same `gap-3` on every data row so
          the PRICE / STATUS labels sit directly above their
          respective cells rather than to the left. */}
      <div className="hidden md:flex items-center bg-[#f2f1f4] px-6 h-10 gap-3">
        <p className="flex-1 min-w-0 text-xs font-semibold text-[#594d73] tracking-[0.25px] uppercase">Product</p>
        <p className="w-[88px] shrink-0 text-center text-xs font-semibold text-[#594d73] tracking-[0.25px] uppercase">Price</p>
        <p className="w-[140px] shrink-0 text-right text-xs font-semibold text-[#594d73] tracking-[0.25px] uppercase">Status</p>
      </div>

      <div className="flex flex-col">
        {rows.map((row, i) => {
          const isInteractive = !!(row.action && row.actionHref)
          const isExpandable = !!row.details
          const isExpanded = isExpandable && expandedIndex === i

          const price = row.price

          // Per-row product-name treatment per Figma:
          //   normal → Poppins Medium 16, `#160b2b` (foreground)
          //   muted  → Poppins Medium 16, `#594d73` (muted-foreground)
          //            + line-through — used for sale-ended audit rows
          //            (e.g. ETH Early Bird after the wave closes).
          // The optional `detail` sub-line renders as a small uppercase
          // caption under the name when a row supplies one (currently
          // no rows do — all "VIA VOUCHER" / "VIA SELF PROTOCOL" hints
          // were dropped in the latest design pass, but the field
          // stays wired for future use).
          // Name/price color: muted (struck) for closed rows, muted (un-struck)
          // for dimmed future tiers (e.g. Final Waves), else the normal dark fg.
          const nameClass = row.muted
            ? 'text-[#594d73] line-through'
            : row.dimmed
              ? 'text-[#594d73]'
              : 'text-[#160b2b]'
          const priceColorClass = row.dimmed ? 'text-[#594d73]' : 'text-[#221144]'
          const productBlock = (
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <p className={`text-base leading-6 font-medium ${nameClass}`}>
                {row.name}
              </p>
              {row.detail && (
                <p className="text-[11px] font-bold text-[#594d73] tracking-[0.25px] uppercase leading-none">
                  {row.detail}
                </p>
              )}
            </div>
          )

          // Desktop cell content is just text — the green "FREE" band comes
          // from `bg-[#d5f4dd]` on the wrapping cell div, not from any inline
          // chip. Line-through when the row is muted so closed sale rows read
          // as an audit entry rather than a live price.
          const strikeClass = row.muted ? 'line-through' : ''
          const isFree = price === 'FREE'

          const priceContent = price ? (
            <span className={`text-base font-bold ${priceColorClass} leading-none ${strikeClass}`}>{price}</span>
          ) : null

          // Mobile: no column concept, so the price renders inline. "FREE"
          // keeps its green chip per the Figma mobile spec; dollar prices are
          // plain bold text.
          const pricePill = price ? (
            isFree ? (
              <span className={`inline-flex items-center bg-[#d5f4dd] rounded px-2 py-1 text-base font-bold ${priceColorClass} leading-none ${strikeClass}`}>
                {price}
              </span>
            ) : (
              <span className={`inline-flex items-center text-base font-bold ${priceColorClass} leading-none ${strikeClass}`}>
                {price}
              </span>
            )
          ) : null

          const actionSlot = row.muted ? (
            // Non-interactive status text for closed / muted rows.
            // Figma: `Poppins Medium 16 #594d73` — same weight as
            // "Date TBA" below, since both are muted status labels
            // rather than active CTAs.
            <span className="text-base font-medium text-[#594d73] leading-6 whitespace-nowrap">Sale ended</span>
          ) : row.actionCountdown ? (
            <span className="inline-block text-base font-bold text-[#7235ed] leading-6 whitespace-nowrap">
              <CountdownText value={row.actionCountdown} />
            </span>
          ) : isInteractive ? (
            isExpandable ? (
              <NextLink
                href={row.actionHref!}
                onClick={e => e.stopPropagation()}
                className="inline-flex gap-1.5 items-center pl-2 py-1 rounded-full text-base font-bold text-[#7235ed] whitespace-nowrap leading-none hover:underline"
              >
                {row.action}
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </NextLink>
            ) : (
              <span className="inline-flex gap-1.5 items-center pl-2 py-1 rounded-full text-base font-bold text-[#7235ed] whitespace-nowrap leading-none">
                {row.action}
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </span>
            )
          ) : row.date ? (
            <p className="text-base font-medium text-[#594d73] leading-6 whitespace-nowrap">{row.date}</p>
          ) : null

          // Desktop layout (md+, ≥768px): strict 3-column row matching
          // the column header widths. The price cell gets the green
          // `#d5f4dd` full-height background only for "FREE" rows (e.g.
          // Core Devs); dollar prices stay on the plain row background.
          const priceCellBg = isFree ? 'bg-[#d5f4dd]' : ''
          const mainRow = (
            <>
              {/* Desktop row */}
              <div className="hidden md:flex items-center px-6 min-h-[64px] gap-3">
                {productBlock}
                <div className={`w-[88px] shrink-0 self-stretch ${priceCellBg} flex items-center justify-center`}>
                  {priceContent}
                </div>
                <div className="w-[140px] shrink-0 flex flex-col items-end justify-center gap-0.5 py-2">
                  {actionSlot}
                  {row.actionNote}
                </div>
              </div>
              {/* Mobile row */}
              <div className="md:hidden flex flex-col gap-3 p-4">
                {productBlock}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap min-w-0">{pricePill}</div>
                  {actionSlot && (
                    <div className="ml-auto shrink-0 flex flex-col items-end gap-0.5">
                      {actionSlot}
                      {row.actionNote}
                    </div>
                  )}
                </div>
              </div>
            </>
          )

          // `border-solid` is required alongside `border-t`: the global
          // `* { border: 0 }` reset in assets/css/index.scss loads after
          // Tailwind preflight and resets border-style to `none`, so a
          // bare `border-t` renders no line at all.
          const containerClasses = 'flex flex-col border-t border-solid border-[rgba(34,17,68,0.1)] transition-colors'
          const hoverClasses = (isInteractive || isExpandable) && !row.muted ? 'hover:bg-[rgba(114,53,237,0.02)]' : ''
          const activeClasses = isExpanded ? 'bg-[rgba(114,53,237,0.04)]' : ''
          const mutedClasses = row.muted ? 'pointer-events-none' : ''

          const richBlock = row.richContent ? (
            <div className="mx-6 pb-4 pt-1">{row.richContent}</div>
          ) : null

          const expandedPanel = isExpanded ? (
            <div className="mx-6 pb-4 pt-1 text-sm text-[#1a0d33] leading-5 flex flex-col gap-2">
              {row.details}
            </div>
          ) : null

          if (isExpandable) {
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => setExpandedIndex(prev => (prev === i ? null : i))}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setExpandedIndex(prev => (prev === i ? null : i))
                  }
                }}
                className={`${containerClasses} ${hoverClasses} ${activeClasses} ${mutedClasses} cursor-pointer`}
              >
                {mainRow}
                {richBlock}
                {expandedPanel}
              </div>
            )
          }

          if (isInteractive) {
            return (
              <NextLink
                key={i}
                href={row.actionHref!}
                className={`${containerClasses} ${hoverClasses} ${mutedClasses}`}
              >
                {mainRow}
                {richBlock}
              </NextLink>
            )
          }

          return (
            <div key={i} className={`${containerClasses} ${mutedClasses}`}>
              {mainRow}
              {richBlock}
            </div>
          )
        })}

        {tapLabel && (
          <p className="text-[11px] font-medium text-[#756a8a] tracking-[0.25px] uppercase text-center leading-[1.1] py-3 border-t border-solid border-[rgba(34,17,68,0.1)]">
            {tapLabel}
          </p>
        )}
      </div>
    </div>
  )
}
