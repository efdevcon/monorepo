import React from 'react'
import Link from 'next/link'
import { CalendarRange, HeartHandshake, BriefcaseBusiness, Blocks, ArrowRight } from 'lucide-react'
import css from './landing-page.module.scss'

const cards = [
  {
    icon: CalendarRange,
    title: 'Programming & Agenda',
    paragraphs: [
      'Four days of technical depth and human connection.',
      'Explore multiple stages featuring protocol research, infrastructure scaling, and real-world impact stories. From newcomer sessions to advanced cryptography, our programming covers the full spectrum of Ethereum building.',
    ],
  },
  {
    icon: HeartHandshake,
    title: 'Community Hubs',
    paragraphs: [
      'Thematic spaces built by the ecosystem, for the ecosystem.',
      'Join specialized areas for deep dives into topics like account abstraction, public goods, and decentralized identity. These hubs host independent demos, office hours, and spontaneous collaborative sessions.',
    ],
  },
  {
    icon: BriefcaseBusiness,
    title: 'Coworking Spaces',
    paragraphs: [
      'Integrated spaces designed for focus and coordination.',
      'Our coworking areas provide the infrastructure you need to stay productive and connected between sessions. Stay under one roof to maximize collaboration with fellow builders and minimize the impact of city travel.',
    ],
  },
  {
    icon: Blocks,
    title: 'Hands-on Experiences',
    paragraphs: [
      'Devcon is an experience you enter, not just an event you attend.',
      'Participate in interactive workshops, technical experiments, and live coding sessions. Move beyond passive listening to engage with Ethereum as a tangible tool through practical, site-specific activations.',
    ],
  },
]

export function WhatToExpect() {
  return (
    <div className="section">
      <div className={css.expect}>
        <div className={css['expect-header']}>
          <h2 className={css['section-title']}>What to expect</h2>
          <p className={css['expect-subtitle']}>
            Devcon is more than just a conference with talks and presentations.
          </p>
          <div className={css['expect-body']}>
            <p>
              We host Devcon to educate and empower the community to build and use decentralized systems. And it is a
              conference for builders of all kinds: developers, designers, researchers, infrastructure operators,
              organizers, artists, and more.
            </p>
            <p>
              Our goal is to push the boundaries of possibility in our mission to bring decentralized protocols, tools,
              and culture to the world. Programming covers content ranging from the deeply technical to the profoundly
              human.
            </p>
          </div>
        </div>

        <div className={css['expect-grid']}>
          <span className={css['included-tag']}>INCLUDED IN YOUR TICKET</span>

          {cards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.title} className={css['expect-card']}>
                <div className={css['expect-icon']}>
                  <Icon />
                </div>
                <div className={css['expect-card-content']}>
                  <h4 className={css['expect-card-title']}>{card.title}</h4>
                  <div className={css['expect-card-body']}>
                    {card.paragraphs.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          <div className={css['expect-cta']}>
            <Link href="/tickets" className={css['button-primary']}>
              Get tickets
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
