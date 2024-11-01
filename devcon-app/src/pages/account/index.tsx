import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import SettingsPage from 'components/domain/app/account/Settings'
import { AppLayout } from 'components/domain/app/Layout'
import { SEO } from 'components/domain/seo'
import React from 'react'

export default (props: any) => {
  return (
    <AppLayout pageTitle="Account" breadcrumbs={[{ label: 'Account' }]}>
      <SEO title="Account" />
      <PrivatePage>
        <SettingsPage {...props} />
      </PrivatePage>
    </AppLayout>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}
