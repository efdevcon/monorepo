import React from 'react'
import Image from 'next/image'
import { ArrowLeft, CalendarDays, MapPin, Ticket, Coffee, Ribbon } from 'lucide-react'
import Page from 'components/common/layouts/page'
import { Link } from 'components/common/link'
import themes from '../../themes.module.scss'
import css from './store.module.scss'
import StoreSidebarLogo from 'assets/images/dc-8/dc8-logo.png'
import { PatronCard, PATRON_RELIEF_URL } from 'components/domain/tickets/PatronCard'

// Dedicated landing for the Patron ticket (POC), a shareable URL for the Nepal
// relief campaign. The same card also sits on /tickets/store/ under #patron;
// this page only adds a focused sidebar around it.

export default function PatronTicketPage() {
  return (
    <Page theme={themes['tickets']} hideFooter darkHeader>
      <div className={css['store-layout']}>
        <aside className={css['sidebar']}>
          <Link to="/tickets/store" className={css['sidebar-back']}>
            <ArrowLeft size={20} />
            Back to Ticket Store
          </Link>
          <div className={css['sidebar-content']}>
            <div className={css['sidebar-top']}>
              <div className={css['sidebar-logo']}>
                <Image src={StoreSidebarLogo} alt="Devcon India" height={56} width={127} />
              </div>
              <h2 className={css['sidebar-title']}>Patron Ticket</h2>
              <p className={css['sidebar-description']}>
                A full Devcon India ticket for supporters who want to give more. You choose the amount, and everything
                above the minimum is donated to{' '}
                <a className={css['inline-link']} href={PATRON_RELIEF_URL} target="_blank" rel="noreferrer">
                  nepalrelief.org
                </a>
                .
              </p>
              <div className={css['sidebar-includes']}>
                <p className={css['sidebar-includes-label']}>Included in ticket:</p>
                <ul className={css['sidebar-includes-list']}>
                  <li className={css['sidebar-includes-item']}>
                    <Ticket size={20} strokeWidth={1.5} aria-hidden="true" />
                    Full conference access
                  </li>
                  <li className={css['sidebar-includes-item']}>
                    <Coffee size={20} strokeWidth={1.5} aria-hidden="true" />
                    Catering all week
                  </li>
                  <li className={css['sidebar-includes-item']}>
                    <Ribbon size={20} strokeWidth={1.5} aria-hidden="true" />
                    Event swag bag
                  </li>
                </ul>
              </div>
            </div>
            <ul className={css['sidebar-details']}>
              <li className={css['sidebar-details-item']}>
                <CalendarDays size={20} color="#1a0d33" strokeWidth={1.5} aria-hidden="true" />
                3–6 November 2026
              </li>
              <li className={css['sidebar-details-item']}>
                <MapPin size={20} color="#1a0d33" strokeWidth={1.5} aria-hidden="true" />
                Jio World Centre, Mumbai, India
              </li>
            </ul>
          </div>
        </aside>

        <div className={css['content-wrapper']}>
          <div className={css['content']}>
            <PatronCard variant="page" />
          </div>
        </div>
      </div>
    </Page>
  )
}

// No getStaticProps/getServerSideProps on purpose, matching the store pages:
// the item is fetched client-side from /api/tickets/patron-info/ so the page
// stays statically served.
