import React from 'react'
import cn from 'classnames'
import ListIcon from 'assets/icons/list.svg'
import TimelineIcon from 'assets/icons/timeline.svg'
import VenueMap from 'assets/images/dc-7/venue/venue-map.jpg'
import VenueLogo from 'assets/images/dc-7/venue/qsncc.png'
import Image from 'next/image'
import css from './event.module.scss'
import { usePanzoom, PanzoomControls } from './panzoom'
import { StandalonePrompt } from 'lib/components/ai/standalone-prompt'
import { useRecoilState } from 'recoil'
import { devaBotVisibleAtom } from 'pages/_app'
import { Link } from 'components/common/link'

// import Panzoom, { PanZoom } from 'panzoom'

export const cardClass =
  'flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] lg:rounded-3xl relative lg:bg-[#fbfbfb]'

// const Switch = () => {
//   return (
//     <div className="flex justify-evenly bg-[#EFEBFF] gap-1.5 rounded-lg p-1 mt-2 shrink-0 mb-2 self-center text-sm">
//       <div
//         className={cn(
//           'flex justify-center items-center self-center grow rounded-md gap-2 px-2 text-[#A897FF] hover:bg-white hover:shadow-md cursor-pointer p-0.5 transition-all duration-300 select-none',
//           {
//             'bg-white shadow-md !text-[#7D52F4]': !timelineView,
//           }
//         )}
//         onClick={() => setTimelineView(false)}
//       >
//         <ListIcon
//           className="transition-all duration-300"
//           style={!timelineView ? { fill: '#7D52F4', fontSize: '14px' } : { fill: '#A897FF', fontSize: '14px' }}
//         />
//         Floor Map
//       </div>
//       <div
//         className={cn(
//           'flex justify-center items-center rounded-md gap-2 text-[#A897FF] px-2 hover:bg-white hover:shadow-md cursor-pointer p-0.5 transition-all duration-300 select-none',
//           {
//             'bg-white shadow-md !text-[#7D52F4]': timelineView,
//           }
//         )}
//         onClick={() => {
//           setTimelineView(true)

//           // if (Object.keys(sessionFilter.day).length === 0) {
//           //   setSessionFilter({
//           //     ...sessionFilter,
//           //     day: { 'Nov 12': true },
//           //   })
//           // }
//         }}
//       >
//         <TimelineIcon
//           className="transition-all duration-300"
//           style={timelineView ? { fill: '#7D52F4', fontSize: '14px' } : { fill: '#A497FF', fontSize: '14px' }}
//         />
//         Timeline View
//       </div>
//     </div>
//   )
// }

const List = (props: any) => {
  return (
    <div className="px-4 ">
      <p className="mb-4 pt-4 font-semibold">Floors & Rooms</p>

      <div className="mb-4">
        {/* <p className="text-xs text-gray-500 mb-2">STAGES</p> */}
        {props.floors.map((floor: any) => {
          let floorName = floor

          if (floor === 'G') floorName = 'G — Ground Floor'
          if (floor === '1') floorName = 'L1 — First Floor'
          if (floor === '2') floorName = 'L2 — Second Floor'

          const rooms = props.rooms
            .filter((room: any) => room.info === floor)
            .sort((a: any, b: any) => {
              if (a.name === 'Main Stage') return -1
              if (b.name === 'Main Stage') return 1

              if (a.name.toLowerCase().startsWith('stage')) {
                if (b.name.toLowerCase().startsWith('stage')) {
                  return a.name.localeCompare(b.name)
                }
                return -1
              }

              if (b.name.toLowerCase().startsWith('stage')) return 1

              if (a.name.toLowerCase().startsWith('breakout')) {
                if (b.name.toLowerCase().startsWith('breakout')) {
                  return a.name.localeCompare(b.name)
                }
                return 1
              }

              if (b.name.toLowerCase().startsWith('breakout')) return -1

              return a.name.localeCompare(b.name)
            })

          return (
            <div className="flex flex-col" key={floor}>
              <div
                key={floor}
                className="flex items-center text-sm border border-solid border-[#E1E4EA] p-2 bg-white rounded-xl mb-2"
              >
                {/* <div className="w-3 h-3 rounded-full bg-[#7D52F4] ml-1 mr-3" /> */}
                <p className="font-semibold ml-1">{floorName}</p>
              </div>

              {rooms.map((room: any) => {
                const getColor = (roomName: string) => {
                  const name = roomName.toLowerCase()
                  if (name.startsWith('classroom')) return '#14B8A6' // teal
                  if (name.includes('decompression') || name.includes('music stage')) return '#22C55E' // green
                  if (name.startsWith('stage') || name === 'main stage') return '#7D52F4' // purple
                  if (name.startsWith('breakout')) return '#EF4444' // red
                  return '#7D52F4' // default purple
                }

                let roomName = room.name

                if (roomName === 'Main Stage') {
                  roomName += ' — Masks'
                }

                if (roomName === 'Stage 1') {
                  roomName += ' — Fans'
                }

                if (roomName === 'Stage 2') {
                  roomName += ' — Lanterns'
                }

                if (roomName === 'Stage 3') {
                  roomName += ' — Fabrics'
                }

                if (roomName === 'Stage 4') {
                  roomName += ' — Leaf'
                }

                if (roomName === 'Stage 5') {
                  roomName += ' — Hats'
                }

                if (roomName === 'Stage 6') {
                  roomName += ' — Kites'
                }

                if (roomName === 'Keynote') return null

                return (
                  <Link
                    to={`/schedule?room=${room.name}`}
                    key={room.name}
                    className="flex ml-4 items-center justify-between text-sm border border-solid border-[#E1E4EA] p-2 bg-white rounded-xl mb-2 group hover:bg-[#F5F7F9] cursor-pointer"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full ml-1 mr-3"
                        style={{ backgroundColor: getColor(room.name) }}
                      />
                      <p className="whitespace-nowrap">{roomName}</p>
                    </div>
                    <div className="opacity-0 hidden lg:block text-sm text-gray-500 group-hover:opacity-100 transition-all duration-300">
                      Click to view sessions in this room
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const Venue = (props: any) => {
  const pz = usePanzoom()
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)

  return (
    <>
      <div className={cn(cardClass, 'my-4 lg:max-w-[550px] !bg-[#c774dd1a]')}>
        <div
          className={cn(
            css['panzoom'],
            'border-t border-solid border-[#E1E4EA] border-b lg:border-none aspect-[4000/3845]'
          )}
        >
          <div className={cn(css['image'], 'lg:rounded-3xl')} id="image-container">
            <Image
              src={VenueMap}
              alt="venue map"
              className="object-contain lg:rounded-3xl h-full w-full"
              id="venue-image"
            />
          </div>
          <PanzoomControls pz={pz} />
          <div className="absolute bottom-2 left-4 lg:bottom-3 lg:left-4 flex flex-col z-[1] text-xs">
            <div className="text-[#7D52F4]">QSNCC</div>
            <div className="text-[#A897FF]">Venue Map</div>
          </div>

          <div className="absolute bottom-2 right-4 lg:bottom-3 lg:right-4 flex flex-col z-[1] text-xs">
            <div className="text-[#7D52F4]">Zoom/drag for a closer view</div>
          </div>
        </div>
      </div>
      <div className={cn(cardClass, 'my-4')}>
        <List floors={props.floors} rooms={props.rooms} />

        <p className="text-sm font-semibold border-top pt-4 mb-4 mx-4">Ask Devai</p>

        <StandalonePrompt className="mx-4" onClick={() => setDevaBotVisible('Tell me where I can go to take a nap')}>
          <div className="truncate">Tell me where I can go to take a nap</div>
        </StandalonePrompt>
        <StandalonePrompt className="mt-2 mx-4" onClick={() => setDevaBotVisible('What can I do at the music stage?')}>
          <div className="truncate">What can I do at the music stage?</div>
        </StandalonePrompt>
        <StandalonePrompt className="mt-2 mx-4" onClick={() => setDevaBotVisible('What is the decompression room?')}>
          <div className="truncate">What is the decompression room?</div>
        </StandalonePrompt>
        <StandalonePrompt className="mt-2 mx-4 lg:mb-4" onClick={() => setDevaBotVisible('What are breakout rooms?')}>
          <div className="truncate">What are breakout rooms?</div>
        </StandalonePrompt>
      </div>
    </>
  )
}
