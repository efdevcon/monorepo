import React from 'react'
import { Link } from 'components/common/link'
import { ArrowRight } from 'lucide-react'
import cn from 'classnames'
import css from './applications-table.module.scss'

export type ApplicationRow = {
  id: string
  name: string
  price: string
  date?: string
  applyUrl?: string
  live: boolean
}

type ApplicationsTableProps = {
  rows: ApplicationRow[]
  status: string
  title?: string
  gstNote?: string | false
}

export function ApplicationsTable({
  rows,
  status,
  title = 'Applications',
  gstNote = 'Prices incl. 18% GST',
}: ApplicationsTableProps) {
  return (
    <div className={css['applications-block']}>
      <div className={css['card']}>
        <div className={css['header']}>
          <span className={css['title']}>{title}</span>
          <span className={css['status']}>{status}</span>
        </div>
        <div className={css['rows']}>
          {rows.map(row => (
            <div key={row.id} className={css['row']}>
              <span className={cn(css['row-name'], { [css['row-name-live']]: row.live })}>{row.name}</span>
              <div className={css['row-meta']}>
                {row.live && <span className={css['row-live-badge']}>LIVE</span>}
                <span className={cn(css['row-price'], { [css['row-price-live']]: row.live })}>{row.price}</span>
                {row.live && row.applyUrl ? (
                  <Link to={row.applyUrl} className={css['row-apply']}>
                    Apply
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </Link>
                ) : (
                  <span className={css['row-date']}>{row.date}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {gstNote !== false && <p className={css['gst-note']}>{gstNote}</p>}
    </div>
  )
}
