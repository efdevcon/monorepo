import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import css from './landing-page.module.scss'
import cn from 'classnames'

export function TicketBanner() {
  return (
    <div className={css['ticket-banner']}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/images/jaali-pattern-left.svg" alt="" className={css['jaali-left']} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/images/jaali-pattern-right.svg" alt="" className={css['jaali-right']} />

      <p className={css['ticket-banner-text']}>Local Early Bird tickets available until 15 March</p>
      <Link href="/tickets" className={cn(css['button-primary'], 'z-[1]')}>
        Get tickets
        <ArrowRight size={16} />
      </Link>
    </div>
  )
}
