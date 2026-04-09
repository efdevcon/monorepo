import React from 'react'
import { CircleFadingArrowUp, Newspaper, CalendarPlus2, HeartHandshake, ArrowUpRight } from 'lucide-react'
import css from './landing-page.module.scss'

interface ContributeCard {
  icon: React.ElementType
  iconColor: 'purple' | 'teal' | 'green' | 'pink'
  title: string
  description: string
  cta: React.ReactNode
}

const cards: ContributeCard[] = [
  {
    icon: CircleFadingArrowUp,
    iconColor: 'purple',
    title: 'Submit a DIP',
    description:
      'Devcon Improvement Proposals (DIPs) are ways for the community to suggest things to add, remove, or improve at the upcoming Devcon.',
    cta: (
      <a href="https://forum.devcon.org" target="_blank" rel="noopener noreferrer" className={css['contribute-cta-link']}>
        Visit Devcon forum <ArrowUpRight size={16} />
      </a>
    ),
  },
  {
    icon: Newspaper,
    iconColor: 'teal',
    title: 'Join our Creative Crew',
    description: `Create content. Build hype. Grow the community. If you've got reach and a genuine love for the ecosystem, we want to collaborate with you.`,
    cta: (
      <div className={css['contribute-cta']}>
        <span className={css['contribute-cta-muted']}>Coming soon!</span>
        <span className={css['contribute-cta-divider']} />
        <a href="https://devcon.org/Devcon__Devconnect_Presskit.pdf" target="_blank" rel="noopener noreferrer" className={css['contribute-cta-link']}>
          Media Partners &amp; Press <ArrowUpRight size={16} />
        </a>
      </div>
    ),
  },
  {
    icon: CalendarPlus2,
    iconColor: 'green',
    title: 'Host a community event',
    description:
      'Host a meetup, workshop, or side event as part of our Ecosystem Program and make it a part of the broader Devcon India story.',
    cta: (
      <a href="/ecosystem-program" className={css['contribute-cta-link']}>
        Learn more <ArrowUpRight size={16} />
      </a>
    ),
  },
  {
    icon: HeartHandshake,
    iconColor: 'pink',
    title: 'Volunteer Program',
    description: `Join a team of passionate contributors keeping Devcon running smoothly \u2013 from registration desks to behind-the-scenes management.`,
    cta: <span className={css['contribute-cta-muted']}>Applications coming soon!</span>,
  },
]

export function ContributeSupport() {
  return (
    <div className="section">
      <div className={css.contribute}>
        <div className={css['contribute-header']}>
          <h2 className={css['section-title']}>Contribute and support</h2>
          <p className={css['intro-subtitle']}>
            Devcon works best when builders ship, communities show up and connect, and supporters help bring it all
            together.
          </p>
        </div>

        <div className={css['contribute-grid']}>
          {cards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.title} className={css['contribute-card']}>
                <div className={`${css['contribute-icon']} ${css[card.iconColor]}`}>
                  <Icon />
                </div>
                <div className={css['contribute-card-text']}>
                  <h4 className={css['contribute-card-title']}>{card.title}</h4>
                  <p className={css['contribute-card-body']}>{card.description}</p>
                </div>
                {card.cta}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
