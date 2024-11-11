import { RoomScreen } from 'components/domain/app/dc7/room-screen/room-screen'
import { sessionsAtom } from 'pages/_app'
import React, { useEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { fetchEvent, fetchRooms, fetchSessionsByRoom } from 'services/event-data'
import { Session } from 'types/Session'

const VenuePage = (props: any) => {
  const sessions = useRecoilValue(sessionsAtom)

  console.log('sessions', sessions)

  if (!sessions) return null

  const sessionsInRoom = sessions.filter(session => session.slot_room?.id === props.room.id)

  // const [sessions, setSessions] = useState<Session[]>(props.sessions || [])

  // useEffect(() => {
  //   setSessions(props.sessions)

  //   // Set up polling every 5 minutes
  //   const intervalId = setInterval(async () => {
  //     try {
  //       const updatedSessions = await fetchSessionsByRoom(props.room.id)
  //       setSessions(updatedSessions)
  //     } catch (error) {
  //       // Silently ignore any errors during refetch
  //       console.debug('Failed to refresh sessions:', error)
  //     }
  //   }, 5 * 60 * 1000) // 5 minutes in milliseconds

  //   // Cleanup interval on component unmount
  //   return () => clearInterval(intervalId)
  // }, [props.sessions, props.room.id])

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
