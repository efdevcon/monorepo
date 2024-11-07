import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import WalletSettings from 'components/domain/app/account/settings/Wallet'
import { AppLayout } from 'components/domain/app/Layout'
import { SEO } from 'components/domain/seo'
import React from 'react'

export default (props: any) => {
  return (
    <AppLayout pageTitle="Wallet Settings" breadcrumbs={[{ label: 'Wallet Settings' }]}>
      <SEO title="Account" />
      <PrivatePage>
        <WalletSettings {...props} />
      </PrivatePage>
    </AppLayout>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}
