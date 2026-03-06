import React from 'react'
import Image from 'next/image'
import { CalendarPlus } from 'lucide-react'
import dc8Logo from 'assets/images/dc-8/dc8-logo.png'
import jioVenue from './images/jio-venue.png'
import JwcLogo from './images/jwc-logo.svg'
import css from './landing-page.module.scss'

export function DevconIntro() {
  return (
    <div className="section">
      <div className={css['section-wrapper']}>
        <div style={{ marginBottom: 16 }}>
          <Image src={dc8Logo} alt="Devcon 8 India" width={145} height={64} />
        </div>
        <div className={css.intro}>
          <div className={css['intro-copy']}>
            <h2 className={css['intro-title']}>
              Devcon is the Ethereum conference for developers, thinkers, and makers.
            </h2>
            <p className={css['intro-subtitle']}>
              {`Devcon's mission is to bring decentralized protocols, tools, and culture to the people and make Ethereum more accessible around the world.`}
            </p>
            <p className={css['intro-body']}>
              {`Whether you're a seasoned Ethereum expert or just starting, Devcon is for you. It's an intensive introduction for new Ethereum explorers, a global family reunion for those already a part of our ecosystem, and a source of energy and creativity for all.`}
            </p>
          </div>
          <div className={css['venue-card']}>
            <div className={css['venue-top']}>
              <div className={css['venue-image']}>
                <Image src={jioVenue} alt="Jio World Centre" fill style={{ objectFit: 'cover' }} />
              </div>
              <JwcLogo className={css['venue-logo']} />
            </div>
            <div className={css['venue-bottom']}>
              <div className={css['venue-info']}>
                <span className={css['venue-location']}>Mumbai, India</span>
                <span className={css['venue-date']}>{`3\u20136 November, 2026`}</span>
              </div>
              <button className={css['venue-cta']}>
                Add to Calendar
                <CalendarPlus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
