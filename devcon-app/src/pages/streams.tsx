import moment from 'moment'
import Link from 'next/link'
import React from 'react'
import { fetchRooms } from 'services/event-data'
import { Room } from 'types/Room'

export const Streams = (props: any) => {
  const main = props.rooms.filter((room: any) => room.id.startsWith('main') || room.id.startsWith('key'))
  const stages = props.rooms.filter((room: any) => room.id.startsWith('stage-'))
  const classrooms = props.rooms.filter((room: any) => room.id.startsWith('classroom-'))
  const breakouts = props.rooms.filter((room: any) => room.id.startsWith('breakout-'))

  return (
    <div className="flex flex-col gap-4 justify-center items-center">
      <div className="flex flex-row gap-4">
        {main.map((room: Room) => (
          <Stream key={room.id} room={room} />
        ))}
      </div>
      <div className="flex flex-row gap-4">
        {stages.map((room: Room) => (
          <Stream key={room.id} room={room} />
        ))}
      </div>
      <div className="flex flex-row gap-4">
        {classrooms.map((room: Room) => (
          <Stream key={room.id} room={room} />
        ))}
      </div>
      <div className="flex flex-row gap-4">
        {breakouts.map((room: Room) => (
          <Stream key={room.id} room={room} />
        ))}
      </div>
    </div>
  )
}

function Stream({ room }: { room: Room }) {
  console.log('STREAM ROOM', room.id, room)
  const start = moment.utc().add(7, 'hours')
  const day = start.date()
  const youtubeUrl = room.youtubeStreamUrl_1
  const translationUrl = `${room?.translationUrl}/fullscreen?embed=true&hide-toolbar=true&hide-stt=true&language=en-US&bg-color=ffffff&color=30354b&font-size=medium`

  return (
    <div className="flex flex-col w-[300px] gap-4">
      <h2>{room.name}</h2>

      <div className="">
        <iframe
          src={youtubeUrl}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full rounded-2xl"
        />
      </div>

      <div className="h-[240px]">
        <iframe
          src={translationUrl}
          title="Mainstage"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          height={300}
          className="w-full h-full rounded-xl"
        />
        <Link href={translationUrl} target="_blank">
          View in new tab
        </Link>
      </div>
    </div>
  )
}

export default Streams

export async function getStaticProps(context: any) {
  return {
    props: {
      rooms: await fetchRooms(),
    },
  }
}
