import React from 'react'
import cn from 'classnames'
import css from './info-table.module.scss'

interface InfoTableProps {
  columns: [string, string]
  rows: Array<[string, string]>
  className?: string
  /** Below 768px, stack each row's cells vertically (name over description) */
  stackOnMobile?: boolean
  /** From 768px, right-align the second column (header + values) */
  alignValuesRight?: boolean
  /** Below 768px, use 20px side gutters instead of the default 24px */
  tightMobileGutters?: boolean
}

// Two-column fact table with the dark-purple header band (zone/feel,
// emergency numbers, metro routes on the Travel Guide)
export const InfoTable = ({
  columns,
  rows,
  className,
  stackOnMobile,
  alignValuesRight,
  tightMobileGutters,
}: InfoTableProps) => {
  return (
    <div
      className={cn(
        css['table'],
        stackOnMobile && css['stack-mobile'],
        alignValuesRight && css['align-values-right'],
        tightMobileGutters && css['tight-mobile-gutters'],
        className
      )}
    >
      <div className={css['header']}>
        {stackOnMobile ? (
          <>
            {/* Stacked rows get a single combined header label on mobile */}
            <p className="max-md:hidden">{columns[0]}</p>
            <p className="max-md:hidden">{columns[1]}</p>
            <p className="md:hidden">
              {columns[0]} & {columns[1]}
            </p>
          </>
        ) : (
          <>
            <p>{columns[0]}</p>
            <p>{columns[1]}</p>
          </>
        )}
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className={css['row']}>
          <p className={css['label']}>{label}</p>
          <p>{value}</p>
        </div>
      ))}
    </div>
  )
}
