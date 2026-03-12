import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BloomingEthFlower } from './BloomingEthFlower'
import cn from 'classnames'
import css from './landing-page.module.scss'

const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
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
            <strong>Applications</strong> — <em>This will include Builder Discounts, Student Discounts, and Youth Tickets
            for those under 18.</em>
          </li>
          <li>
            <strong>Ecosystem Tickets</strong> — <em>An application will be open for leaders & organizers of various web2
            & web3 communities or meetups to apply for free or discounted tickets for their groups.</em>
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

const FAQ_INITIAL_COUNT = 6

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const visibleFaq = FAQ_ITEMS

  return (
    <div className={css.faq}>
      <div className="section">
        <div className={css['faq-inner']}>
          <h2 className={css['faq-title']}>Frequently asked questions</h2>

          <div className={css['faq-container']}>
            <div className={css['faq-accordion']}>
              {visibleFaq.map((item, i) => (
                <div key={i} className={css['faq-item']}>
                  <button
                    type="button"
                    className={cn(css['faq-trigger'], openIndex === i && css['faq-trigger-open'])}
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    aria-expanded={openIndex === i}
                  >
                    <span>{item.q}</span>
                    {openIndex === i ? (
                      <ChevronUp size={16} strokeWidth={2} className={css['faq-chevron']} />
                    ) : (
                      <ChevronDown size={16} strokeWidth={2} className={css['faq-chevron']} />
                    )}
                  </button>
                  <div className={cn(css['faq-answer-wrap'], openIndex === i && css['faq-answer-open'])}>
                    <div className={css['faq-answer-inner']}>
                      <div className={css['faq-answer']}>{item.a}</div>
                    </div>
                  </div>
                  {i < visibleFaq.length - 1 && <div className={css['faq-border']} />}
                </div>
              ))}
            </div>

            {/* View all button hidden while FAQ has few entries
            {!showAll && (
              <button type="button" className={css['faq-view-all']} onClick={() => setShowAll(true)}>
                View all <span>({FAQ_ITEMS.length})</span>
              </button>
            )}
            */}
          </div>

          <BloomingEthFlower className={css['faq-flower']} />
        </div>
      </div>
    </div>
  )
}
