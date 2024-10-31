import React from 'react'
import { AppLayout } from 'components/domain/app/Layout'
import { Link } from 'components/common/link'
import { AppNav } from 'components/domain/app/navigation'

const Offline = () => {
  return (
    <AppLayout pageTitle="Offline" breadcrumbs={[{ label: 'Offline' }]}>
      <>
        <AppNav
          nested
          links={[
            {
              title: 'Offline',
            },
          ]}
        />

        <div className="section clear-top clear-bottom">
          <p>
            You are currently offline and this page was not cached.&nbsp;
            <Link to="/" className="generic">
              Go back to home.
            </Link>
          </p>
        </div>
      </>
    </AppLayout>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}

export default Offline
