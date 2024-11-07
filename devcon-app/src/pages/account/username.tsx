import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import UsernameSettings from 'components/domain/app/account/settings/Username'
import { AppLayout } from 'components/domain/app/Layout'
import { SEO } from 'components/domain/seo'
import React from 'react'

export default (props: any) => {
  return (
    <AppLayout pageTitle="Username Settings" breadcrumbs={[{ label: 'Username Settings' }]}>
      <SEO title="Account" />
      <PrivatePage>
        <UsernameSettings {...props} />
      </PrivatePage>
    </AppLayout>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}
