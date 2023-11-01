import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import SettingsPage from 'components/domain/app/account/Settings'
import { AppLayout } from 'components/domain/app/Layout'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
import { getGlobalData } from 'services/global'
import { GetEvent, GetRooms, GetSessionsByRoom } from 'services/programming'
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
  const rooms = await GetRooms()

  return {
    props: {
      rooms,
    },
  }
}
