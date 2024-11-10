import { AppLayout } from 'components/domain/app/Layout'
import React from 'react'
import { fetchEvent, fetchRooms, fetchSessionsByRoom } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import cn from 'classnames'
import { useRecoilValue, useRecoilState } from 'recoil'
import { selectedEventTabAtom } from 'pages/_app'
import { Venue } from 'components/domain/app/dc7/event'

const activeClass = '!border-[#7D52F4] !text-[#7D52F4] '
const tabClass =
  'cursor-pointer pb-2 px-0.5 border-b-2 border-solid border-transparent transition-all duration-300 select-none'

const Tabs = () => {
  const [selectedEventTab, setSelectedEventTab] = useRecoilState(selectedEventTabAtom)

  //   return null

  return (
    <div className="flex gap-4 px-4">
      <div
        onClick={() => setSelectedEventTab('venue')}
        className={cn(tabClass, selectedEventTab === 'venue' && activeClass)}
      >
        Venue Map
      </div>
      {/* <div
        onClick={() => setSelectedEventTab('information')}
        className={cn(tabClass, selectedEventTab === 'information' && activeClass)}
      >
        Information
      </div> */}
      {/* <div
        onClick={() => setSelectedEventTab('contact')}
        className={cn(tabClass, selectedEventTab === 'contact' && activeClass)}
      >
        Contact
      </div>
      <div
        onClick={() => setSelectedEventTab('directions')}
        className={cn(tabClass, selectedEventTab === 'directions' && activeClass)}
      >
        Directions
      </div> */}
    </div>
  )
}

const VenuePage = (props: any) => {
  const floorOrder: any = { G: 0, '1': 1, '2': 2 }
  const uniqueFloors = [...new Set(props.rooms.map((room: any) => room.info))].sort(
    (a: any, b: any) => floorOrder[a] - floorOrder[b]
  )

  return (
    <AppLayout pageTitle="Event" breadcrumbs={[{ label: 'Event' }]}>
      <SEO title="Event" />
      <Tabs />
      <Venue floors={uniqueFloors} rooms={props.rooms} />
    </AppLayout>
  )
}

export default VenuePage

// export async function getStaticPaths() {
//   const rooms = await fetchRooms()
//   const paths = rooms.map(i => {
//     return { params: { id: i.id } }
//   })

//   return {
//     paths,
//     fallback: false,
//   }
// }

export async function getStaticProps(context: any) {
  //   const id = context.params.id
  //   const room = (await fetchRooms()).find(i => i.id === id)

  //   if (!room) {
  //     return {
  //       props: null,
  //       notFound: true,
  //     }
  //   }

  return {
    props: {
      event: await fetchEvent(),
      rooms: await fetchRooms(),
      //   sessions: await fetchSessionsByRoom(id),
    },
  }
}
