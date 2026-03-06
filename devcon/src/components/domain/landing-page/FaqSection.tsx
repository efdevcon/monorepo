import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BloomingEthFlower } from './BloomingEthFlower'
import cn from 'classnames'
import css from './landing-page.module.scss'

const FAQ_ITEMS = [
  {
    q: 'I plan on bringing my child to Devcon with me. Do they need a ticket?',
    a: 'If your child is between the ages of 5-17, they will need a Youth ticket, which can be purchased at any time at tickets.devcon.org. Children under the age of 5 do not need a ticket. A Youth Ticket will not be valid for anyone 18+.',
  },
  {
    q: 'When will General ticket sales start?',
    a: 'General admission waves will be announced. Global Early Bird launches 6 April.',
  },
  {
    q: 'Will there be opportunities to obtain discounted tickets?',
    a: 'Yes. Self-claiming discounts for Indian locals are available now. Additional discount categories open throughout 2026.',
  },
  {
    q: 'If I buy a ticket, and then I am accepted to Speak, can I get a refund for the original ticket I purchased?',
    a: 'Please contact the ticketing team for refund eligibility.',
  },
  {
    q: 'If I am accepted for a discount after buying a full-priced ticket, can I get refund of the difference?',
    a: 'Please contact the ticketing team for refund eligibility.',
  },
  {
    q: 'What if I only need to cancel some tickets on an order with multiple?',
    a: 'Partial cancellations are possible. Please contact the ticketing team.',
  },
  {
    q: 'I need a Visa Invitation Letter. How can I obtain one?',
    a: 'Visa invitation letters are available after ticket purchase. Check your confirmation email for details on how to request one.',
  },
  {
    q: 'When will I get my ticket?',
    a: 'Tickets are delivered electronically after purchase. You will receive a confirmation email with your ticket details.',
  },
  {
    q: 'Can I purchase tickets with crypto?',
    a: 'Yes. Crypto and fiat payments are accepted, with a 3% discount for crypto payments.',
  },
  {
    q: 'How can I cancel my order?',
    a: 'Please contact the ticketing team for cancellation and refund requests.',
  },
  {
    q: 'Tickets are sold out — how can I attend?',
    a: 'Join the waitlist and follow our social channels for updates on additional ticket releases.',
  },
  {
    q: 'Can I transfer my ticket to someone else?',
    a: 'Discounted tickets are non-transferable. General admission tickets may be transferable — check your ticket terms for details.',
  },
]

const FAQ_INITIAL_COUNT = 6

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const visibleFaq = showAll ? FAQ_ITEMS : FAQ_ITEMS.slice(0, FAQ_INITIAL_COUNT)

  return (
    <div className={css.faq}>
      <div className="section">
        <h2 className={css['faq-title']}>Frequently asked questions</h2>
      </div>

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
                  <p className={css['faq-answer']}>{item.a}</p>
                </div>
              </div>
              {i < visibleFaq.length - 1 && <div className={css['faq-border']} />}
            </div>
          ))}
        </div>

        {!showAll && (
          <button type="button" className={css['faq-view-all']} onClick={() => setShowAll(true)}>
            View all <span>({FAQ_ITEMS.length})</span>
          </button>
        )}
      </div>

      <BloomingEthFlower className={css['faq-flower']} />
    </div>
  )
}
