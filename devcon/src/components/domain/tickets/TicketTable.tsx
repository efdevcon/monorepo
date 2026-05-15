import React, { useState } from 'react'
import NextLink from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CountdownText } from 'components/common/CountdownText'

export interface TicketRow {
  name: string
  detail?: string
  status?: 'open' | 'coming'
  price?: string
  date?: string
  action?: string
  actionHref?: string
  // Countdown text rendered in the action slot (purple, right-aligned). Used
  // for the featured-but-not-yet-live wave: the countdown sits where the
  // "Get tickets" button would be once the wave opens.
  actionCountdown?: string
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
}

interface TicketTableProps {
  title: string
  subtitle: string
  rows: TicketRow[]
  tapLabel?: string
  // Label shown on the green pill for `status: 'open'` rows. Defaults to
  // "OPEN" — the General Admission table overrides this to "OPEN NOW" since
  // its open-state is genuinely time-limited.
  openLabel?: string
}

export function TicketTable({ title, subtitle, rows, tapLabel, openLabel = 'OPEN' }: TicketTableProps) {
  // Single-expansion within each table — matches the legacy ApplicationRow UX.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  return (
    <div className="bg-white border border-[rgba(34,17,68,0.1)] rounded-2xl overflow-hidden shadow-[0_1px_2px_0_rgba(22,11,43,0.1),0_2px_4px_0_rgba(22,11,43,0.08),0_4px_16px_0_rgba(22,11,43,0.12)] w-full">
      {/* Dark gradient header */}
      <div className="flex items-center justify-between gap-4 px-6 py-6 bg-gradient-to-r from-[#221144] via-[#2e1b58] to-[#221144]">
        <p className="text-xl font-bold text-[#f9f8fa] tracking-[-0.5px] leading-[1.1]">{title}</p>
        <p className="text-xs font-semibold text-[#dddae2] tracking-[0.25px] uppercase">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
        {rows.map((row, i) => {
          const isLive = row.status === 'open'
          const isInteractive = !!(row.action && row.actionHref)
          const isExpandable = !!row.details
          const isExpanded = isExpandable && expandedIndex === i
          // Live OR upcoming wave (one with richContent attached) → emphasized
          // styling; otherwise the row stays muted gray.
          const isEmphasized = isLive || !!row.richContent
          // Opacity is applied to non-tag children only so the SALE ENDED badge
          // remains fully visible while name/price/etc. fade out.
          const mutedChildClasses = row.muted ? 'opacity-50' : ''

          const actionSlot = row.muted ? (
            <span className="text-base font-bold text-[#594d73] text-right sm:w-[136px] leading-6 whitespace-nowrap">
              Sale ended
            </span>
          ) : row.actionCountdown ? (
            <span className="inline-block text-right text-base font-bold text-[#7235ed] sm:w-[136px] leading-6 whitespace-nowrap">
              <CountdownText value={row.actionCountdown} />
            </span>
          ) : isInteractive ? (
            isExpandable ? (
              // Inside an expandable row: the action becomes its own Link with
              // stopPropagation so the row toggle doesn't fire.
              <NextLink
                href={row.actionHref!}
                onClick={e => e.stopPropagation()}
                className="inline-flex gap-1.5 items-center justify-end pl-2 py-1 rounded-full sm:w-[136px] text-base font-bold text-[#7235ed] text-right whitespace-nowrap leading-none hover:underline"
              >
                {row.action}
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </NextLink>
            ) : (
              <span className="inline-flex gap-1.5 items-center justify-end pl-2 py-1 rounded-full sm:w-[136px] text-base font-bold text-[#7235ed] text-right whitespace-nowrap leading-none">
                {row.action}
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </span>
            )
          ) : (
            row.date && (
              <p className="text-base font-medium text-[#594d73] text-right sm:w-[136px] leading-6 whitespace-nowrap">{row.date}</p>
            )
          )

          const mainRow = (
            <div className="flex items-center gap-4 w-full">
              {/* Left column: name on top, status+price below on mobile; all
                  inline on sm+ so they sit on a single row alongside name. */}
              <div className={`flex-1 min-w-0 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6 ${mutedChildClasses}`}>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <p className={`text-base leading-6 ${
                    isEmphasized ? 'font-bold text-[#160b2b]' : 'font-medium text-[#594d73]'
                  } ${row.muted ? 'line-through' : ''}`}>{row.name}</p>
                  {row.detail && (
                    <p className="text-xs font-bold text-[#594d73] tracking-[0.25px] uppercase leading-4">{row.detail}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                  {row.status === 'open' && (
                    <span className="inline-flex items-center bg-[#aaeaba] rounded px-2 py-1 text-sm font-bold text-[#221144] tracking-[0.5px] leading-none whitespace-nowrap">
                      {openLabel}
                    </span>
                  )}

                  {row.price && (
                    <p className={`text-base whitespace-nowrap ${isEmphasized ? 'font-bold text-[#160b2b] leading-6' : 'font-medium text-[#594d73] leading-6'}`}>
                      {row.price}
                    </p>
                  )}
                </div>
              </div>

              {/* Right column: action — vertically centered with the whole left stack on mobile */}
              <div className="shrink-0">{actionSlot}</div>
            </div>
          )

          const containerClasses = 'flex flex-col bg-[#f2f1f4] rounded-lg p-4 transition-colors'
          const hoverClasses = (isInteractive || isExpandable) && !row.muted ? 'hover:bg-[#e9e7ee]' : ''
          const activeClasses = isExpanded ? 'bg-[#ebe8f0]' : ''
          const mutedClasses = row.muted ? 'pointer-events-none' : ''

          // Rich content rendered below the main row (live info like a countdown).
          const richBlock = row.richContent ? (
            <div className="mt-4 pt-4 border-t border-solid border-[rgba(34,17,68,0.08)]">
              {row.richContent}
            </div>
          ) : null

          // Expanded panel — divider + provided details, only when expanded.
          const expandedPanel = isExpanded ? (
            <div className="mt-4 pt-4 border-t border-solid border-[rgba(34,17,68,0.08)] text-sm text-[#1a0d33] leading-5 flex flex-col gap-2">
              {row.details}
            </div>
          ) : null

          // 1) Expandable + interactive: outer is a button (toggle), inner action is a Link.
          // 2) Expandable only: outer is a button (toggle).
          // 3) Interactive only: outer is a NextLink (navigate).
          // 4) Neither: plain div.
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
          <p className="text-[11px] font-medium text-[#756a8a] tracking-[0.25px] uppercase text-center leading-[1.1] pt-1 pb-1">
            {tapLabel}
          </p>
        )}
      </div>
    </div>
  )
}
