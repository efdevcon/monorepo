import React from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { SEO } from 'components/domain/seo'
import { MapPin, CarFront, Clock, UserRound, CircleAlert, TriangleAlert, ArrowUpRight } from 'lucide-react'
import themes from './themes.module.scss'
import HeroBackground from './past-events-hero.png'
import MoonBackground from 'assets/images/pages/faq-moon-bg.svg'
import css from './childcare.module.scss'
import cn from 'classnames'

const KLAY_WEBSITE = 'https://klay.co.in/foundational-development-program/mumbai/equinox/'
const KLAY_MAPS = 'https://maps.app.goo.gl/DWE3nzzDEXACjStT9'
const KLAY_EMAIL = 'shilpa.tlc1361@klay.co.in'
const KLAY_PHONE = '+91 8591180038'

export default function ChildcarePage() {
  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <SEO
        title="Childcare"
        description="Childcare option for Devcon 8 attendees — KLAY Equinox offers a special discounted rate near the venue in Mumbai."
      />

      <PageHero
        className={`${css['hero-no-side-gradient']} !mb-0`}
        titleClassName={css['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title="Childcare"
      />

      {/* ── Intro band ─────────────────────────────────────── */}
      <section className={cn(css['intro'], 'section')}>
        <div className={css['intro-inner']}>
          <h1 className={css['intro-title']}>
            Childcare for
            <br />
            Devcon Attendees
          </h1>
          <div className={css['intro-description']}>
            <p>
              To help make Devcon more accessible for attendees traveling with young children, KLAY Equinox is offering
              a special discounted rate directly to Devcon 8 attendees.
            </p>
            <p>
              KLAY Equinox is an independent childcare provider located approximately 2.4 km from the Devcon 8 venue at
              Jio World Convention Centre (around 8 minutes by car). Devcon is sharing this option to help families
              plan their time during the event. For more information, please visit the{' '}
              <a href={KLAY_WEBSITE} target="_blank" rel="noopener noreferrer">
                official KLAY Equinox website
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ── Main section ───────────────────────────────────── */}
      <section className={cn(css['main'], 'section')}>
        <div className={css['main-bg-moon']} aria-hidden="true">
          <MoonBackground />
        </div>
        <div className={css['main-inner']}>
          {/* Contact information */}
          <div className={css['card']}>
            <h2 className={css['card-title']}>KLAY Equinox Centre Contact Information</h2>
            <div className={css['info-rows']}>
              <div className={css['info-row']}>
                <MapPin size={24} strokeWidth={2} className={css['info-icon']} aria-hidden="true" />
                <div className={css['info-body']}>
                  <p className={css['info-label']}>Address</p>
                  <p>Lobby Ground Floor, Tower 4, Equinox Business Park, Kurla West, Mumbai 400070</p>
                  <a href={KLAY_MAPS} target="_blank" rel="noopener noreferrer" className={css['info-link']}>
                    Open in Google Maps
                    <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
                  </a>
                </div>
              </div>
              <div className={css['info-row']}>
                <CarFront size={24} strokeWidth={2} className={css['info-icon']} aria-hidden="true" />
                <div className={css['info-body']}>
                  <p className={css['info-label']}>Distance from the Devcon venue</p>
                  <p>Approximately 2.4 km — around 8 minutes by car (traffic dependent).</p>
                </div>
              </div>
              <div className={css['info-row']}>
                <Clock size={24} strokeWidth={2} className={css['info-icon']} aria-hidden="true" />
                <div className={css['info-body']}>
                  <p className={css['info-label']}>Operating hours provided by KLAY</p>
                  <p>Monday – Friday: 8:30 AM – 7:30 PM</p>
                  <p>Saturday: 9:00 AM – 2:00 PM (subject to centre operations)</p>
                </div>
              </div>
              <div className={css['info-row']}>
                <UserRound size={24} strokeWidth={2} className={css['info-icon']} aria-hidden="true" />
                <div className={css['info-body']}>
                  <p className={css['info-label']}>Point of contact</p>
                  <p>
                    KLAY has assigned a dedicated contact to assist Devcon 8 attendees with enquiries, registration,
                    availability, and childcare arrangements.
                  </p>
                  <p>
                    Shilpa Waghmare — <a href={`mailto:${KLAY_EMAIL}`}>{KLAY_EMAIL}</a> —{' '}
                    <a href={`tel:${KLAY_PHONE.replace(/\s/g, '')}`}>{KLAY_PHONE}</a>
                  </p>
                </div>
              </div>
            </div>
            <p className={css['card-footnote']}>
              Attendees should confirm current operating hours, availability, age requirements, and registration
              conditions directly with KLAY.
            </p>
          </div>

          {/* How to access the discount */}
          <div className={css['card']}>
            <h2 className={css['card-title']}>How to Access the Devcon Discount</h2>
            <ol className={css['steps']}>
              <li>Contact KLAY Equinox directly to enquire about availability.</li>
              <li>
                Mention that you are attending <strong>Devcon 8</strong>.
              </li>
              <li>Present your valid Devcon ticket during registration to receive the special attendee rate.</li>
              <li>Complete any registration forms required by KLAY before your child&apos;s first visit.</li>
            </ol>
            <div className={css['note-callout']}>
              <CircleAlert size={18} strokeWidth={2} className={css['note-callout-icon']} aria-hidden="true" />
              <p>Availability is subject to centre capacity, so early booking is encouraged.</p>
            </div>
          </div>

          {/* Important notes */}
          <div className={css['card']}>
            <h2 className={css['card-title']}>Important Notes</h2>
            <ul className={css['notes-list']}>
              <li>
                Childcare services are <strong>provided and operated entirely by KLAY</strong>, an independent
                childcare provider.
              </li>
              <li>
                All enquiries, bookings, registration, admission decisions, payments, refunds, childcare services, and
                complaints are handled directly by KLAY.
              </li>
              <li>
                Devcon does not guarantee availability or provide transportation, escorts, or supervision between the
                event venue and the KLAY premises.
              </li>
              <li>
                To better support Devcon families, KLAY Equinox intends to provide a dedicated childcare area for
                children of Devcon 8 attendees, subject to operational feasibility and centre capacity.
              </li>
              <li>
                Parents and guardians should review KLAY&apos;s terms, policies, eligibility requirements, and
                operating procedures before booking.
              </li>
              <li>
                Parents and guardians are responsible for deciding whether the KLAY services are appropriate for their
                child.
              </li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div className={css['disclaimer']}>
            <div className={css['disclaimer-header']}>
              <TriangleAlert size={18} strokeWidth={2} aria-hidden="true" />
              <p className={css['disclaimer-label']}>Disclaimer</p>
            </div>
            <p className={css['disclaimer-text']}>
              The childcare services are provided independently by KLAY at its own premises. If you choose to use these
              services, you will contract directly with KLAY, and your use of the services will be subject to
              KLAY&apos;s terms and conditions, policies, and any applicable law. The Ethereum Foundation assumes no
              responsibility for the provision of the childcare services by KLAY or for any of their acts or omissions.
            </p>
          </div>

          {/* Contact CTA */}
          <hr className={css['cta-divider']} />
          <div className={css['cta-card']}>
            <p className={css['cta-title']}>Ready to arrange childcare?</p>
            <a
              href={`mailto:${KLAY_EMAIL}`}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#7235ed] px-8 py-3.5 text-base font-bold text-white transition-[background-color,transform] duration-150 ease-out hover:scale-[1.03] hover:bg-[#5f23d6] active:scale-[0.97] md:w-auto"
              aria-label="Contact KLAY Equinox by email"
            >
              Contact KLAY Equinox
              <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </Page>
  )
}
