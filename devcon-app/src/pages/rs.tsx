import React from 'react'
import { fetchEvent, fetchRooms, fetchSessionsByRoom } from 'services/event-data'
import Link from 'next/link'

const RoomLinks = (props: any) => {
  return (
    <div className="flex flex-wrap mt-4 gap-4 justify-center items-center">
      {props.rooms.map((room: any) => (
        <Link href={`/room-screens/${room.id}`} key={room.id} className="text-lg font-bold p-4 bg-gray-100 hover:bg-gray-300 rounded-md">{room.name}</Link>
      ))}
    </div>
  )
}

export default RoomLinks

export async function getStaticProps(context: any) {
  return {
    props: {
      rooms: await fetchRooms()
    },
  }
}