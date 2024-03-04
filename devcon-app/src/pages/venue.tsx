import { AppLayout } from 'components/domain/app/Layout'
import { Venue } from 'components/domain/app/venue'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { fetchFloors, fetchRooms, fetchSessions, fetchEvent } from 'services/event-data'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { getGlobalData } from 'services/global'
import { useRouter } from 'next/router'
import { Room as RoomType } from 'types/Room'
import { Session as SessionType } from 'types/Session'
import { defaultSlugify } from 'utils/formatting'
import { Room } from 'components/domain/app/venue/Room'
import { Floor } from 'components/domain/app/venue/Floor'
import { SEO } from 'components/domain/seo'

export default pageHOC(({ sessions, ...props }: any) => {
  const { query } = useRouter()
  const roomID = query.room
  const room = props.rooms.find((room: RoomType) => room.id === roomID)
  const sessionsByRoom = sessions.filter((i: SessionType) => i.room?.id === roomID)
  const floorID = query.floor
  const floor = props.floors.find((i: string) => defaultSlugify(i) === floorID)
  const roomsByFloor = props.rooms.filter((i: RoomType) => i.info === floor)

  if (room) {
    return (
      <AppLayout>
        <Room room={room} sessions={sessionsByRoom} event={props.event} />
      </AppLayout>
    )
  }

  if (floor) {
    return (
      <AppLayout>
        <Floor floor={floor} rooms={roomsByFloor} />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <>
        <SEO title="Agora Convention Center" />
        <Venue {...props} />
      </>
    </AppLayout>
  )
})

export async function getStaticProps(context: any) {
  const rooms = await fetchRooms()
  const floors = await fetchFloors()

  return {
    props: {
      page: DEFAULT_APP_PAGE,
      rooms,
      event: await fetchEvent(),
      floors,
      sessions: await fetchSessions(),
    },
  }
}
