import React from 'react'
import { useTranslations } from 'next-intl'
import Page from 'components/common/layouts/page'
import themes from '../../themes.module.scss'
import css from './store.module.scss'
import { StoreSidebar } from 'components/domain/tickets/StoreSidebar'
import { PatronCard, PatronReliefLink } from 'components/domain/tickets/PatronCard'

// Dedicated landing for the Patron ticket, a shareable URL for the Nepal
// relief campaign. The same card also sits on /tickets/store/ under #patron;
// this page only adds a focused sidebar around it.

export default function PatronTicketPage() {
  const t = useTranslations('tickets.patron.page')

  return (
    <Page theme={themes['tickets']} hideFooter darkHeader>
      <div className={css['store-layout']}>
        <StoreSidebar
          backHref="/tickets/store"
          backLabel={t('back')}
          title={t('title')}
          description={t.rich('description', { link: chunks => <PatronReliefLink>{chunks}</PatronReliefLink> })}
        />

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
// stays statically served. Intl messages come from _app's per-locale bundle.
