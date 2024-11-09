import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import SettingsPage from 'components/domain/app/account/Settings'
import { AppLayout } from 'components/domain/app/Layout'
import { SEO } from 'components/domain/seo'
import React from 'react'

const Account = (props: any) => {
  return (
    <AppLayout pageTitle="Account Settings" breadcrumbs={[{ label: 'Account Settings' }]}>
      <SEO title="Account Settings" />
      <PrivatePage>
        <SettingsPage {...props} />
      </PrivatePage>
    </AppLayout>
  )
}

export default Account

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}
