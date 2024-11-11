import React, { useState } from 'react'
import cn from 'classnames'
import ListIcon from 'assets/icons/list.svg'
import TimelineIcon from 'assets/icons/timeline.svg'
import VenueMap from 'assets/images/dc-7/venue/venue-map-floors.jpg'
import VenueLogo from 'assets/images/dc-7/venue/qsncc.png'
import Image from 'next/image'
import css from './event.module.scss'
import { usePanzoom, PanzoomControls } from './panzoom'
import { StandalonePrompt } from 'lib/components/ai/standalone-prompt'
import { useRecoilState } from 'recoil'
import { devaBotVisibleAtom } from 'pages/_app'
import { Link } from 'components/common/link'
import { CollapsedSection, CollapsedSectionHeader, CollapsedSectionContent } from 'components/common/collapsed-section'
import { TrailTexture } from '@react-three/drei'

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
      <div className={cn(cardClass, 'mb-4 mt-2 !bg-[#c2b5ff]')}>
        <div
          className={cn(
            css['panzoom'],
            'border-t border-solid border-[#E1E4EA] border-b lg:border-none aspect-[4000/3845] md:aspect-[16/7] lg:rounded-3xl'
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

const sections = (setDevaBotVisible: (prompt: string) => void) => [
  {
    header: 'Devcon Thrival Guide',
    body: (
      <div className="px-4 pb-2">
        <div className="mb-4">
          <p className="mb-2">Your comprehensive guide to having the best possible Devcon experience.</p>
        </div>

        <div>
          <a
            href="https://thrive.devcon.org"
            className="text-[#7D52F4] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View the Thrival Guide
          </a>
        </div>

        <StandalonePrompt
          className="mt-4 lg:mb-2"
          onClick={() => setDevaBotVisible('What is the Devcon Thrival Guide?')}
        >
          <div className="truncate">Ask Devai about the Devcon Thrival Guide</div>
        </StandalonePrompt>
      </div>
    ),
  },
  {
    header: 'Registration and Venue Hours',
    body: (
      <div className="px-4 pb-2">
        <div className="mb-4">
          <strong>Registration</strong>
          <p>
            Your ticket QR code was delivered via email. Search for subject: "Your Devcon ticket is ready for download".
          </p>
          <p>
            At the registration desk, you'll receive your wristband – please keep it on throughout all 4 days of Devcon.
            🙏
          </p>
        </div>

        <div className="mb-4">
          <strong>Skip the line of 12,000 people:</strong>
          <ul className="list-disc pl-5 mt-1">
            <li>
              <strong>Pre-Registration:</strong> November 10 and 11, 10:00–18:00
              <br />
              QSNCC, at the foyer on Level G
            </li>
            <li>
              <strong>Registration:</strong> November 12, 8:30 AM
              <br />
              QSNCC, Level G, Hall 2
            </li>
          </ul>
        </div>

        <div className="mb-4">
          <strong>Venue Hours & Ceremonies</strong>
          <ul className="list-disc pl-5 mt-1">
            <li>Venue Hours: 9:00 AM–8:00 PM (8:30 AM on Day 1, November 12)</li>
            <li>Sessions: 10:00 AM–6:30 PM daily</li>
            <li>Opening Ceremony: November 12, 10:00 AM–12:30 PM</li>
            <li>Closing Ceremony: November 15, 4:00 PM–6:00 PM</li>
          </ul>
        </div>

        <div className="mb-4">
          <strong>Last Day Specials</strong>
          <ul className="list-disc pl-5 mt-1">
            <li>Smoothie: 1:00 PM - 3:00 PM at Snacks area 3 (Level 1)</li>
            <li>Happy Hour: After closing ceremony</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    header: 'Food & Beverage',
    body: (
      <div className="px-4 pb-2">
        <div className="mb-2">
          <strong>Breakfast</strong>
          <br />
          09:00 AM - 11:00 AM
          <br />
          Location: Level G and Level 1
        </div>
        <div className="mb-2">
          <strong>Lunch</strong>
          <br />
          12:00 PM - 03:00 PM
          <br />
          Location: Level G and Level 2
        </div>
        <div className="mb-2">
          <strong>Heavy Snacks</strong>
          <br />
          04:00 PM - 07:00 PM
          <br />
          Location: All Levels
        </div>
        <div className="mb-2">
          <strong>Available All Day (All Levels)</strong>
          <ul className="list-disc pl-5">
            <li>Snacks and fruits</li>
            <li>Tea and Coffee</li>
            <li>Water Dispensers</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    header: 'Internet Access',
    body: (
      <div className="px-4 pb-2">
        <div className="mb-2">
          <strong>Wifi Access</strong>
          <br />
          Network name: Ethereum
          <br />
          Password: theinfinitegarden
        </div>

        <div className="mb-2">
          <strong>Mobile Data Options</strong>
          <ul className="list-disc pl-5">
            <li>Roamless is offering 2GB free data with code "DEVCON7"</li>
            <li>
              Local SIM providers:
              <ul className="list-disc pl-5 mt-1">
                <li>
                  <strong>AIS</strong> (recommended for signal stability & better service)
                  <br />
                  <a
                    href="https://www.ais.th/en/consumers/package/international/tourist-plan"
                    className="text-[#7D52F4] hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Tourist Plan Details
                  </a>
                </li>
                <li>
                  <strong>True</strong>
                  <br />
                  <a
                    href="https://www.true.th/en/international/roaming/tourist-sim"
                    className="text-[#7D52F4] hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Tourist Plan Details
                  </a>
                </li>
              </ul>
            </li>
            <li>SIM cards available at Suvarnabhumi airport booths</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    header: 'Emergency Contacts',
    body: (
      <>
        <div className="px-4 pb-2">
          <a
            href="https://docs.google.com/document/d/1Hu4TT9pvo0ckXFRom0t-UL-xIMMuvOmGvu93eCHl-yA/edit?tab=t.0"
            className="text-[#7D52F4] hover:underline pb-2 block"
            target="_blank"
            rel="noopener noreferrer"
          >
            What to do in case of an emergency
          </a>

          <div className="mb-2">
            Police 👮‍♂️
            <br />
            191
          </div>
          <div className="mb-2">
            Fire Department 🚒
            <br />
            119
          </div>
          <div className="mb-2">
            Ambulance 🚑
            <br />
            1669
          </div>
          <div className="mb-2">
            QSNCC Emergency Contact
            <br />
            02-229-3099
          </div>
          <div className="mb-2">
            Embassies
            <br />
            <a
              href="https://www.mfa.go.th/en/page/diplomatic-and-consular-list"
              className="text-[#7D52F4] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.mfa.go.th/en/page/diplomatic-and-consular-list
            </a>
          </div>
        </div>
      </>
    ),
  },
  //   {
  //     header: 'Impact Booths',
  //     body: (
  //       <div className="px-4 pb-2">
  //         <div className="mb-2">
  //           <strong>Meet teams in the Ethereum ecosystem</strong>
  //           <br />
  //           <strong>Location:</strong> Level 1
  //         </div>

  //         <div className="mb-2">
  //           You're able to find over 50 ecosystem teams in the Impact Forum spaces. There are three areas with Impact
  //           Spaces.
  //         </div>

  //         <div>
  //           Check them out and meet teams building in Ethereum.{' '}
  //           <a
  //             href="https://blog.ethereum.org/2024/10/25/devcon-supporters-forum"
  //             className="text-[#7D52F4] hover:underline"
  //             target="_blank"
  //             rel="noopener noreferrer"
  //           >
  //             Find all teams that are represented here
  //           </a>
  //           .
  //         </div>
  //       </div>
  //     ),
  //   },
  //   {
  //     header: 'Experiences',
  //     body: <div className="px-4 pb-2">{/* Add Experiences content */}</div>,
  //   },
  //   {
  //     header: 'Legal and Privacy Policies',
  //     body: <div className="px-4 pb-2">{/* Add Legal and Privacy Policies content */}</div>,
  //   },
]

export const VenueInformation = (props: any) => {
  const [openTabs, setOpenTabs] = useState<any>({ 'important-info': true })
  const [_, setDevaBotVisible] = useRecoilState(devaBotVisibleAtom)

  return (
    <div className={cn(cardClass, 'p-4 flex flex-col gap-3 text-sm')}>
      {sections(setDevaBotVisible).map((section: any) => (
        <CollapsedSection
          className="bg-white rounded-2xl border border-solid border-[#E1E4EA]"
          open={openTabs[section.header]}
          setOpen={() => {
            const isOpen = openTabs[section.header]

            const nextOpenState = {
              ...openTabs,
              [section.header]: !isOpen,
            }

            setOpenTabs(nextOpenState)
          }}
          key={section.header}
        >
          <CollapsedSectionHeader title={section.header} className="py-4 px-4 " />
          <CollapsedSectionContent>{section.body}</CollapsedSectionContent>
        </CollapsedSection>
      ))}
    </div>
  )
}
