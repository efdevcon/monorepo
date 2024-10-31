import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import UsernameSettings from 'components/domain/app/account/settings/Username'
import { AppLayout } from 'components/domain/app/Layout'
import React from 'react'

export default (props: any) => {
  return (
    <AppLayout pageTitle="Username Settings" breadcrumbs={[{ label: 'Username Settings' }]}>
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
