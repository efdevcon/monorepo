import React from 'react'
import cn from 'classnames'
import css from './info-table.module.scss'

interface InfoTableProps {
  columns: [string, string]
  rows: Array<[string, string]>
  className?: string
}

// Two-column fact table with the dark-purple header band (zone/feel,
// emergency numbers, metro routes on the Travel Guide)
export const InfoTable = ({ columns, rows, className }: InfoTableProps) => {
  return (
    <div className={cn(css['table'], className)}>
      <div className={css['header']}>
        <p>{columns[0]}</p>
        <p>{columns[1]}</p>
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
