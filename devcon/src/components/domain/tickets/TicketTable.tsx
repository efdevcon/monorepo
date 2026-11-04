import React, { useState } from 'react'
import NextLink from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CountdownText } from 'components/common/CountdownText'

export interface TicketRow {
  name: string
  detail?: string
  status?: 'open' | 'coming'
  // USD price shown in the USD column (e.g. "$999" or "FREE"). Absent →
  // cell blank.
  price?: string
  // Rupee price the same buyer pays by UPI (e.g. "₹3,315"), shown in the
  // RUPEES column with the green band (India products only). Absent → cell
  // blank.
  priceInr?: string
  date?: string
  action?: string
  actionHref?: string
  // Countdown text rendered in the action slot (purple, right-aligned). Used
  // for the featured-but-not-yet-live wave: the countdown sits where the
  // "Get tickets" button would be once the wave opens.
  actionCountdown?: string
  // Small annotation rendered directly beneath the action/status slot inside
  // the STATUS column (e.g. "11% off until Aug 11" under "Get tickets").
  // Unlike `richContent` it lives inside the main row, so the RUPEES / USD
  // column backgrounds stretch to cover it.
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
 * Official UPI mark (NPCI: grey "UPI" letters + orange/green chevrons,
 * tagline dropped) on a small white rounded badge — the RUPEES column
 * indicator. The vector is the official logo (Wikimedia Commons
 * `UPI-Logo-vector.svg`, trimmed to the mark); rendered inline so we don't
 * ship a separate image asset from this component. `size` is the badge
 * height; the width follows the mark's 3.7:1 ratio plus padding.
 */
export function UpiGlyphTile({ size = 14 }: { size?: number }) {
  const width = Math.round(size * 2.6)
  return (
    <svg width={width} height={size} viewBox="0 0 52 20" xmlns="http://www.w3.org/2000/svg" aria-label="UPI" role="img">
      <rect width="52" height="20" rx="4" fill="#ffffff" />
      {/* Mark viewBox 0 0 360.568 97.297 → scaled to 44.5×12 and centred. */}
      <g transform="translate(3.75 4) scale(0.12333)">
        <g transform="matrix(1 0 0 -1 -40.4316 173.3501)">
          <path fill="#66686c" transform="translate(316.4629 76.4951)" d="M 0,0 H -19.283 L 7.535,96.855 h 19.284 z" />
          <path
            fill="#66686c"
            transform="translate(306.4521 170.2881)"
            d="m 0,0 c -1.337,1.843 -3.399,2.773 -6.2,2.773 h -106.036 l -5.252,-18.97 h 19.294 v 0.011 h 77.169 l -5.614,-20.272 h -77.171 l 0.007,0.042 h -19.286 l -16.007,-57.787 h 19.296 l 10.742,38.786 h 86.746 c 2.709,0 5.259,0.924 7.657,2.772 2.393,1.85 3.968,4.131 4.723,6.855 L 0.809,-6.996 C 1.593,-4.181 1.322,-1.845 0,0"
          />
          <path
            fill="#66686c"
            transform="translate(156.1196 82.541)"
            d="m 0,0 c -1.065,-3.835 -4.557,-6.488 -8.538,-6.488 h -99.491 c -2.711,0 -4.726,0.924 -6.051,2.77 -1.324,1.848 -1.608,4.134 -0.851,6.857 l 24.276,87.387 h 19.301 l -21.683,-78.05 h 77.206 l 21.683,78.05 h 19.297 z"
          />
          <path fill="#27803b" transform="translate(376.5859 173.1689)" d="m 0,0 24.414,-48.553 -51.322,-48.54 z" />
          <path fill="#e9661c" transform="translate(359.4717 173.1689)" d="m 0,0 24.396,-48.553 -51.343,-48.54 z" />
        </g>
      </g>
    </svg>
  )
}

/** Dark rounded tile containing a white `$` glyph — the USD column indicator. */
export function FiatGlyphTile({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="14" height="14" rx="2" fill="#594d73" />
      <g transform="translate(1 1)" fill="white">
        <path d="M5.625 11V1C5.625 0.793 5.793 0.625 6 0.625C6.207 0.625 6.375 0.793 6.375 1V11C6.375 11.207 6.207 11.375 6 11.375C5.793 11.375 5.625 11.207 5.625 11Z" />
        <path d="M8.625 7.75C8.625 7.385 8.48 7.036 8.222 6.778C7.964 6.52 7.615 6.375 7.25 6.375H4.75C4.186 6.375 3.646 6.151 3.248 5.752C2.849 5.354 2.625 4.814 2.625 4.25C2.625 3.686 2.849 3.146 3.248 2.748C3.646 2.349 4.186 2.125 4.75 2.125H8.5C8.707 2.125 8.875 2.293 8.875 2.5C8.875 2.707 8.707 2.875 8.5 2.875H4.75C4.385 2.875 4.036 3.02 3.778 3.278C3.52 3.536 3.375 3.885 3.375 4.25C3.375 4.615 3.52 4.964 3.778 5.222C4.036 5.48 4.385 5.625 4.75 5.625H7.25C7.814 5.625 8.354 5.849 8.752 6.248C9.151 6.646 9.375 7.186 9.375 7.75C9.375 8.314 9.151 8.854 8.752 9.252C8.354 9.651 7.814 9.875 7.25 9.875H3C2.793 9.875 2.625 9.707 2.625 9.5C2.625 9.293 2.793 9.125 3 9.125H7.25C7.615 9.125 7.964 8.98 8.222 8.722C8.48 8.464 8.625 8.115 8.625 7.75Z" />
      </g>
    </svg>
  )
}

/**
 * TicketTable — the "Ticket-Type-Container" card from the Devcon Figma
 * design (nodes 5160:9160 / 5136:4473 / 5141:8075).
 *
 * Layout: dark gradient header, gray column-header row, then a stack of
 * data rows with 4 columns:
 *
 *   PRODUCT (flex, left)  |  RUPEES (₹X via UPI, green band)  |  USD ($X)  |  STATUS (CTA)
 *
 * Responsive behavior:
 *   - desktop (≥sm): true 4-column table row per item
 *   - mobile (<sm): PRODUCT stacks above; RUPEES/USD pills + STATUS wrap
 *     onto a single line below (per Figma mobile spec)
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
          the RUPEES / USD / STATUS labels sit directly above their
          respective cells rather than to the left. */}
      <div className="hidden md:flex items-center bg-[#f2f1f4] px-6 h-10 gap-3">
        <p className="flex-1 min-w-0 text-xs font-semibold text-[#594d73] tracking-[0.25px] uppercase">Product</p>
        <div className="w-[104px] shrink-0 flex items-center justify-center gap-1.5">
          <UpiGlyphTile />
          <p className="text-xs font-semibold text-[#594d73] tracking-[0.25px] uppercase">Rupees</p>
        </div>
        <div className="w-[88px] shrink-0 flex items-center justify-center gap-1.5">
          <FiatGlyphTile />
          <p className="text-xs font-semibold text-[#594d73] tracking-[0.25px] uppercase">USD</p>
        </div>
        <p className="w-[140px] shrink-0 text-right text-xs font-semibold text-[#594d73] tracking-[0.25px] uppercase">Status</p>
      </div>

      <div className="flex flex-col">
        {rows.map((row, i) => {
          const isInteractive = !!(row.action && row.actionHref)
          const isExpandable = !!row.details
          const isExpanded = isExpandable && expandedIndex === i

          const price = row.price
          const priceInr = row.priceInr

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

          // Desktop cell content is just text — the green band comes from
          // `bg-[#d5f4dd]` on the wrapping cell div, not from any inline
          // chip. Line-through when the row is muted so closed sale rows read
          // as an audit entry rather than a live price.
          const strikeClass = row.muted ? 'line-through' : ''

          // RUPEES cell (desktop): the UPI price for the India products.
          const inrContent = priceInr ? (
            <span className={`text-base font-bold ${priceColorClass} leading-none ${strikeClass}`}>{priceInr}</span>
          ) : null

          // USD cell (desktop): plain price text ("FREE" included — the green
          // band now means "payable in rupees", so it stays off FREE).
          const priceContent = price ? (
            <span className={`text-base font-bold ${priceColorClass} leading-none ${strikeClass}`}>{price}</span>
          ) : null

          // Mobile: no column concept, so the green + UPI badge travel with
          // the rupee price as an inline pill.
          const inrPill = priceInr ? (
            <span className={`inline-flex items-center gap-1.5 bg-[#d5f4dd] rounded px-2 py-1 text-base font-bold ${priceColorClass} leading-none ${strikeClass}`}>
              <UpiGlyphTile size={16} />
              {priceInr}
            </span>
          ) : null

          // Mobile USD pill: dark `$` tile + price. "FREE" is plain text, no
          // tile and no green chip (green means "payable in rupees" now).
          const pricePill = price ? (
            price === 'FREE' ? (
              <span className={`inline-flex items-center text-base font-bold ${priceColorClass} leading-none ${strikeClass}`}>
                {price}
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1.5 text-base font-bold ${priceColorClass} leading-none ${strikeClass}`}>
                <FiatGlyphTile size={16} />
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

          // Desktop layout (md+, ≥768px): strict 4-column row matching
          // the column header widths. The RUPEES cell gets the green
          // `#d5f4dd` full-height background only when the row has a rupee
          // price — empty cells stay plain so the band breaks by design. The
          // USD cell (FREE included) stays on the plain row background.
          const inrCellBg = priceInr ? 'bg-[#d5f4dd]' : ''
          const mainRow = (
            <>
              {/* Desktop row */}
              <div className="hidden md:flex items-center px-6 min-h-[64px] gap-3">
                {productBlock}
                <div className={`w-[104px] shrink-0 self-stretch ${inrCellBg} flex items-center justify-center`}>
                  {inrContent}
                </div>
                <div className="w-[88px] shrink-0 self-stretch flex items-center justify-center">{priceContent}</div>
                <div className="w-[140px] shrink-0 flex flex-col items-end justify-center gap-0.5 py-2">
                  {actionSlot}
                  {row.actionNote}
                </div>
              </div>
              {/* Mobile row */}
              <div className="md:hidden flex flex-col gap-3 p-4">
                {productBlock}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    {inrPill}
                    {pricePill}
                  </div>
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
