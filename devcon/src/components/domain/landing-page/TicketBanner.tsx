import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import JaaliLeft from './images/jaali-pattern-left.svg'
import JaaliRight from './images/jaali-pattern-right.svg'
import css from './landing-page.module.scss'

export function TicketBanner() {
  return (
    <div className={css['ticket-banner']}>
      <JaaliLeft className={css['jaali-left']} />
      <JaaliRight className={css['jaali-right']} />

      <p className={css['ticket-banner-text']}>Local Early Bird tickets available until 15 March</p>
      <Link href="/tickets" className={css['button-primary']}>
        Get tickets
        <ArrowRight size={16} />
      </Link>
    </div>
  )
}
