import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import ProfileSettings from 'components/domain/app/account/settings/Profile'
import { AppLayout } from 'components/domain/app/Layout'
import { SEO } from 'components/domain/seo'
import React from 'react'

export default (props: any) => {
  return (
    <AppLayout pageTitle="Profile Settings" breadcrumbs={[{ label: 'Profile Settings' }]}>
      <SEO title="Account" />
      <PrivatePage>
        <ProfileSettings {...props} />
      </PrivatePage>
    </AppLayout>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}
