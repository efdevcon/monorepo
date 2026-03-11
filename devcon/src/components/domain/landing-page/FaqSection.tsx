import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BloomingEthFlower } from './BloomingEthFlower'
import cn from 'classnames'
import css from './landing-page.module.scss'

const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'When will General ticket sales start?',
    a: 'Waves will start on July 16. More information will follow with the rest of the ticketing launch on July 16.',
  },
  {
    q: 'Will there be opportunities to obtain discounted tickets?',
    a: (
      <>
        <p>Yes! There will be multiple ways to obtain discounted tickets this year:</p>
        <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
          <li>
            <strong>Community Discounts</strong> — This will consist of groups like Protocol Guild members, OSS
            Contributors, Public Goods Project Owners, and more.
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
    q: 'I plan on bringing my child to Devcon with me. Do they need a ticket?',
    a: (
      <>
        Minors between 3-17 will need a ticket to enter Devcon. Children under the age of 3 will not require a ticket.{' '}
        <strong>Everyone under 18</strong> who wishes to enter Devcon will need to have their Parent/Guardian fill our
        Consent Form before they can enter the venue. The Consent Form{' '}
        <a href="#" className="underline">
          can be found here
        </a>
        .
      </>
    ),
  },
  {
    q: 'If I buy a ticket, and then I am accepted to Speak, can I get a refund for the original ticket I purchased?',
    a: 'Yes! Speakers will be given a Free ticket — we will refund your original purchase.',
  },
  {
    q: 'If I am accepted for a discount after buying a full-priced ticket, can I get refund of the difference?',
    a: (
      <>
        Yes — we will do our best to refund the difference. Request the refund at{' '}
        <a href="mailto:support@devcon.org" className="underline">
          support@devcon.org
        </a>
        .
      </>
    ),
  },
  {
    q: 'I need a Visa invitation Letter. How can I obtain one?',
    a: (
      <>
        You need a ticket before you can request a Visa Invitation Letter. Once you{"'"}ve purchased a ticket & have your
        Order ID ready,{' '}
        <a href="https://forms.gle/fYhu45A9HUrbjYRr9" target="_blank" rel="noopener noreferrer" className="underline">
          request a Visa Invitation Letter here
        </a>
        .
      </>
    ),
  },
  {
    q: 'Can I purchase tickets with crypto?',
    a: 'Yes! You will be able to choose between Credit Card or Crypto to pay for your ticket. Orders paid in Crypto receive a 3% discount on total cost.',
  },
  {
    q: 'How can I cancel my order?',
    a: 'Find your original order confirmation email & head to your order page. Then, scroll to the bottom of the page and click Cancel Order.',
  },
  {
    q: 'What if I only need to cancel some tickets on an order with multiple?',
    a: (
      <>
        Reach out to us at{' '}
        <a href="mailto:support@devcon.org" className="underline">
          support@devcon.org
        </a>{' '}
        with your Order Code & the specifics.
      </>
    ),
  },
  {
    q: 'What are the policies towards Refunds & Transfers?',
    a: (
      <>
        <p>
          <strong>Refunds</strong> — All tickets will be refundable as long as the request is made before the start of
          the event. Orders made with <strong>Credit Card</strong> will be refunded back to the original payment method.
          Orders made with Crypto will be refunded back to the original sender address and network via USDC only. Please
          allow up to 4 weeks for refunds to be issued.
        </p>
        <p className="mt-2">
          <strong>Transfers</strong> — In our effort to prevent scalping and ensure equal opportunity for all interested
          community members to be able to purchase tickets, we will only allow ticket transfers on a case-by-case basis
          upon written request to{' '}
          <a href="mailto:support@devcon.org" className="underline">
            support@devcon.org
          </a>
          . PLEASE DO NOT ATTEMPT TO BUY TICKET FROM AN EXTERNAL SOURCE — YOU RISK BEING SCAMMED.
        </p>
      </>
    ),
  },
  {
    q: 'Tickets are sold out - How can I attend?',
    a: (
      <>
        We will open up a Waiting List after our final wave of General Admission tickets have sold out. In the event of
        cancellations, tickets will be granted to those on the Waiting List in the order that they signed up. While we
        don{"'"}t recommend it, if you do purchase a ticket from a third party, we STRONGLY suggest that to do it via
        email & CC{' '}
        <a href="mailto:support@devcon.org" className="underline">
          support@devcon.org
        </a>{' '}
        to facilitate the transfer.
      </>
    ),
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

            {!showAll && (
              <button type="button" className={css['faq-view-all']} onClick={() => setShowAll(true)}>
                View all <span>({FAQ_ITEMS.length})</span>
              </button>
            )}
          </div>

          <BloomingEthFlower className={css['faq-flower']} />
        </div>
      </div>
    </div>
  )
}
