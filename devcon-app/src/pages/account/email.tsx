import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import EmailSettings from 'components/domain/app/account/settings/Email'
import { AppLayout } from 'components/domain/app/Layout'
import React from 'react'

export default (props: any) => {
  return (
    <AppLayout pageTitle="Email Settings" breadcrumbs={[{ label: 'Email Settings' }]}>
      <PrivatePage>
        <EmailSettings {...props} />
      </PrivatePage>
    </AppLayout>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}
