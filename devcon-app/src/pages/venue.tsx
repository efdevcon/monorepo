import { AppLayout } from 'components/domain/app/Layout'
import React from 'react'
import { fetchEvent, fetchRooms, fetchSessionsByRoom } from 'services/event-data'
import { SEO } from 'components/domain/seo'

const cardClass = 'flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] rounded-3xl relative lg:bg-[#fbfbfb]'

const VenuePage = (props: any) => {
  return (
    <AppLayout pageTitle="Venue" breadcrumbs={[{ label: 'Venue' }]}>
      <SEO title="Venue" />
      <div className={cardClass}>I heard you like venues</div>
    </AppLayout>
  )
}

export default VenuePage

export async function getStaticProps(context: any) {
  const rooms = await fetchRooms()
  const event = await fetchEvent()

  return {
    props: {
      event,
      rooms,
    },
  }
}