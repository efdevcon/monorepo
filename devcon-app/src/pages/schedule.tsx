import { AppLayout } from 'components/domain/app/Layout'
import React from 'react'
import { fetchRooms, fetchEvent } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import { SessionLayout } from 'components/domain/app/dc7/sessions'
import { sessionsAtom } from './_app'
import { useRecoilValue } from 'recoil'

export default (props: any) => {
  const sessions = useRecoilValue(sessionsAtom)

  return (
    <AppLayout pageTitle="Schedule" breadcrumbs={[{ label: 'Schedule' }]}>
      <SEO title="Schedule" />

      <SessionLayout sessions={sessions} event={props.event} />
    </AppLayout>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {
      event: await fetchEvent(),
      rooms: await fetchRooms(),
    },
  }
}
