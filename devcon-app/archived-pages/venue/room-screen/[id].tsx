import React from 'react'
import { fetchEvent, fetchRooms, fetchSessionsByRoom } from 'services/event-data'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { SEO } from 'components/domain/seo'
import { RoomScreen } from 'components/domain/app/room-screen'
import { AppContext } from 'context/app-context'

const RoomScreenLayout = (props: any) => {
  return (
    <AppContext>
      <RoomScreen {...props} />
    </AppContext>
  )
}

export default RoomScreenLayout

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
  const rooms = await fetchRooms()
  const id = context.params.id
  const room = rooms.find(i => i.id === id)

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
      rooms,
      room,
      sessions: await fetchSessionsByRoom(id),
    },
  }
}
