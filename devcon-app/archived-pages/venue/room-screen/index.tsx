import React from 'react'
import { fetchRooms } from 'services/event-data'
import { Link } from 'components/common/link'
import { AppContext } from 'context/app-context'

const RoomList = (props: any) => {
  return (
    <AppContext>
      <div>
        {props.rooms
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
          .map((room: any) => {
            if (room.capacity === null) return null

            return (
              <Link key={room.id} to={`/venue/room-screen/${room.id}`} style={{ display: 'block', padding: '24px' }}>
                {room.name}
              </Link>
            )
          })}
      </div>
    </AppContext>
  )
}

export default RoomList

export async function getStaticProps(context: any) {
  const rooms = await fetchRooms()

  return {
    props: {
      rooms,
    },
  }
}
