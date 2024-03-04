import { AppLayout } from 'components/domain/app/Layout'
import { Room } from 'components/domain/app/venue'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { fetchEvent, fetchRooms, fetchSessionsByRoom } from 'services/event-data'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { SEO } from 'components/domain/seo'

export default pageHOC((props: any) => {
  return (
    <AppLayout>
      <SEO title={props.room.name} />
      <Room {...props} />
    </AppLayout>
  )
})

export async function getStaticPaths() {
  const rooms = await fetchRooms()
  const paths = rooms.map(i => {
    return { params: { id: i.id } }
  })

  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps(context: any) {
  const id = context.params.id
  const room = (await fetchRooms()).find(i => i.id === id)

  if (!room) {
    return {
      props: null,
      notFound: true,
    }
  }

  return {
    props: {
      page: DEFAULT_APP_PAGE,
      event: await fetchEvent(),
      room,
      sessions: await fetchSessionsByRoom(id),
    },
  }
}
