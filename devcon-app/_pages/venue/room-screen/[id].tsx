import { AppLayout } from 'components/domain/app/Layout'
import { Room } from 'components/domain/app/venue'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { GetEvent, GetRooms, GetSessionsByRoom } from 'services/programming'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { getGlobalData } from 'services/global'
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
  const rooms = await GetRooms()
  const paths = rooms.map(i => {
    return { params: { id: i.id } }
  })

  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps(context: any) {
  const rooms = await GetRooms()
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
      ...(await getGlobalData(context.locale, true)),
      page: DEFAULT_APP_PAGE,
      event: await GetEvent(),
      rooms,
      room,
      sessions: await GetSessionsByRoom(id),
    },
  }
}
