import React, { useEffect, useState } from 'react'
import { RoomScreen } from 'components/domain/app/dc7/room-screen/room-screen'
import { sessionsAtom } from 'pages/_app'
import { useRecoilState } from 'recoil'
import { fetchEvent, fetchRooms, fetchSessions, fetchSessionsByRoom } from 'services/event-data'
import { Session } from 'types/Session'

const VenuePage = (props: any) => {
  const [sessions, setSessions] = useRecoilState(sessionsAtom)

  useEffect(() => {
    // Set up polling every  minutes
    const intervalId = setInterval(async () => {
      try {
        const sessions = await fetchSessions(Math.random().toString())
        setSessions(sessions)

        console.log('sessions refreshed')
      } catch (error) {
        // Silently ignore any errors during refetch
        console.debug('Failed to refresh sessions:', error)
      }
    }, 30 * 60 * 1000) // 30 minutes in milliseconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId)
  }, [])

  if (!sessions) return null

  const sessionsInRoom = sessions.filter(session => session.slot_room?.id === props.room.id)

  // const [sessions, setSessions] = useState<Session[]>(props.sessions || [])

  return <RoomScreen {...props} sessions={sessionsInRoom} />
}

export default VenuePage

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
      // event: await fetchEvent(),
      room,
      // sessions: await fetchSessionsByRoom(id),
    },
  }
}
