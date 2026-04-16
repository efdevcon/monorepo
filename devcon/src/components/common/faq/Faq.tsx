import React, { useState } from 'react'
import cn from 'classnames'
import { ChevronDown, ChevronUp } from 'lucide-react'
import css from './faq.module.scss'

export interface FaqItem {
  q: string
  a: React.ReactNode
}

// Single source of truth for FAQ content used across pages.
export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'When will General ticket sales start?',
    a: 'General Admission ticket sales for Devcon India will launch in early May. Stay tuned for updates as we get closer to this date.',
  },
  {
    q: 'Will there be opportunities to obtain discounted tickets?',
    a: (
      <>
        <p>Yes! There will be multiple ways to obtain discounted tickets this year:</p>
        <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
          <li>
            <strong>Community Discounts</strong> — This will consist of groups like Protocol Guild members, OSS
            Contributors and more.
          </li>
          <li>
            <strong>Applications</strong> —{' '}
            <em>This will include Builder Discounts, Student Discounts, and Youth Tickets for those under 18.</em>
          </li>
          <li>
            <strong>Ecosystem Tickets</strong> —{' '}
            <em>
              An application will be open for leaders & organizers of various web2 & web3 communities or meetups to
              apply for free or discounted tickets for their groups.
            </em>
          </li>
        </ul>
      </>
    ),
  },
  {
    q: 'Can I purchase tickets with crypto?',
    a: 'Yes! You will be able to choose between Credit Card or Crypto to pay for your ticket. Orders paid in Crypto receive a 3% discount on the total cost.',
  },
]

interface FaqProps {
  items?: FaqItem[]
  className?: string
}

export const Faq = ({ items = FAQ_ITEMS, className }: FaqProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className={cn(css['faq-accordion'], className)}>
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div key={i} className={css['faq-item']}>
            <button
              type="button"
              className={css['faq-trigger']}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              {isOpen ? (
                <ChevronUp size={16} strokeWidth={2} className={css['faq-chevron']} />
              ) : (
                <ChevronDown size={16} strokeWidth={2} className={css['faq-chevron']} />
              )}
            </button>
            <div className={cn(css['faq-answer-wrap'], isOpen && css['faq-answer-open'])}>
              <div className={css['faq-answer-inner']}>
                <div className={css['faq-answer']}>{item.a}</div>
              </div>
            </div>
            {i < items.length - 1 && <div className={css['faq-border']} />}
          </div>
        )
      })}
    </div>
  )
}
