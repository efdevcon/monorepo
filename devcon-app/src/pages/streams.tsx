import moment from 'moment'
import Link from 'next/link'
import React from 'react'
import { fetchRooms } from 'services/event-data'
import { Room } from 'types/Room'

export const Streams = (props: any) => {
  const stages = props.rooms
    .filter(
      (room: any) =>
        room.id.startsWith('main') ||
        room.id.startsWith('stage-') ||
        room.id.startsWith('classroom-') ||
        room.id.startsWith('breakout-')
    )
    .filter((i: any) => !!i.youtubeStreamUrl_3)

  return (
    <div className="flex flex-row flex-wrap gap-4 justify-center items-center">
      {stages.map((room: Room) => (
        <Stream key={room.id} room={room} />
      ))}
    </div>
  )
}

function Stream({ room }: { room: Room }) {
  const start = moment.utc().add(7, 'hours')
  const day = start.date()
  const youtubeUrl = `${room.youtubeStreamUrl_3}${
    room.youtubeStreamUrl_3?.includes('?') ? '&autoplay=1' : '?autoplay=1'
  }`
  const translationUrl = `${room?.translationUrl}/fullscreen?embed=true&hide-toolbar=true&hide-stt=true&language=en-US&bg-color=ffffff&color=30354b&font-size=medium`

  // Add state to force iframe refresh
  const [refresh, setRefresh] = React.useState(0)

  return (
    <div className="flex flex-col w-[250px] gap-4">
      <h2 onClick={() => setRefresh(prev => prev + 1)} className="cursor-pointer hover:opacity-80">
        {room.name}
      </h2>

      <div className="">
        <iframe
          key={`youtube-${refresh}`}
          src={youtubeUrl}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full rounded-2xl"
        />
      </div>

      <div className="h-[240px]">
        <iframe
          key={`translation-${refresh}`}
          src={translationUrl}
          title="Mainstage"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          height={300}
          className="w-full h-full rounded-xl"
        />
        <Link href={translationUrl} target="_blank" className="text-sm mb-2">
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
