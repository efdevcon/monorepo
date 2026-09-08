import React from 'react'
import Image from 'next/image'
import { ArrowLeft, CalendarDays, MapPin, Ticket, Coffee, Ribbon } from 'lucide-react'
import { Link } from 'components/common/link'
import css from 'pages/tickets/store/store.module.scss'
import StoreSidebarLogo from 'assets/images/dc-8/dc8-logo.png'

// Left-hand sidebar shared by the ticket store pages (/tickets/store/ and
// /tickets/store/patron/): back link, DC8 logo, a page-specific title and
// description, then the fixed "included in ticket" list and event details.
// Styles live in store.module.scss alongside the rest of the store layout.

interface StoreSidebarProps {
  backHref: string
  backLabel: string
  title: string
  description: React.ReactNode
}

export function StoreSidebar({ backHref, backLabel, title, description }: StoreSidebarProps) {
  return (
    <aside className={css['sidebar']}>
      <Link to={backHref} className={css['sidebar-back']}>
        <ArrowLeft size={20} />
        {backLabel}
      </Link>
      <div className={css['sidebar-content']}>
        <div className={css['sidebar-top']}>
          <div className={css['sidebar-logo']}>
            <Image src={StoreSidebarLogo} alt="Devcon India" height={56} width={127} />
          </div>
          <h2 className={css['sidebar-title']}>{title}</h2>
          <p className={css['sidebar-description']}>{description}</p>
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
  )
}
