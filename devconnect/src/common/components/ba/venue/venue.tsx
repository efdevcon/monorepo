import React, { useState } from 'react'
import { Calendar, MapPin } from 'lucide-react'
import LaRuralLogo from './images/la-rural-logo.png'
import LaRuralVenue from './images/la-rural-picture.png'
import { Button } from 'lib/components/button'
import Image from 'next/image'
import { AddToCalendarModal, generateCalendarExport } from 'lib/components/add-to-calendar'
import moment from 'moment'
import Link from 'common/components/link'

const Venue: React.FC = () => {
  const [showCalendarModal, setShowCalendarModal] = useState(false)

  const handleAddToCalendar = () => {
    setShowCalendarModal(true)
  }

  const calendarData = generateCalendarExport({
    timezone: 'America/Argentina/Buenos_Aires',
    PRODID: 'devconnect.org',
    icsFileName: 'Devconnect Buenos Aires',
    entries: [
      {
        start: moment.utc('2025-11-17T00:00:00'),
        end: moment.utc('2025-11-23T00:00:00'),
        description: 'Devconnect Buenos Aires, 2025',
        title: 'Devconnect Buenos Aires',
        location: {
          url: 'https://devconnect.org',
          text: 'La Rural, Av. Sarmiento 2704, C1425 Buenos Aires, Argentina',
        },
      },
    ],
  })

  return (
    <section className="border-solid border-t border-neutral-200 border-b bg-[#FAFCFF]">
      <div className="flex flex-col md:flex-row justify-between items-center py-4 border-b px-4 gap-4 xl:gap-8 mx-auto max-w-[1300px]">
        <div className="flex flex-col xl:flex-row gap-4 items-center">
          <div className="flex-none w-[225px] flex items-center">
            {/* Logo */}
            <Image src={LaRuralLogo} alt="La Rural" className="max-w-[400px]" />
          </div>

          <div className="flex-none w-full sm:w-[260px] hidden xl:block ml-8">
            {/* Venue image */}
            <Image src={LaRuralVenue} alt="La Rural venue" className="w-full" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="pb-0 flex flex-col lg:grid lg:grid-cols-[150px_1fr] shrink-0  text-center sm:text-left text-base sm:text-sm">
            <div className="text-[#575a7b] hidden font-semibold lg:block">Venue:</div>
            <div className="text-[#575a7b] font-bold">La Rural</div>

            <div className="text-[#575a7b] hidden font-semibold lg:block">District:</div>
            <div className="text-[#575a7b]">Palermo</div>

            <div className="text-[#575a7b] hidden font-semibold lg:block">Address:</div>
            <div className="text-[#575a7b] max-w-[275px] md:max-w-[250px]">
              Av. Sarmiento 2704, C1425 Cdad. Autónoma de Buenos Aires
            </div>

            <div className="text-[#575a7b] hidden font-semibold lg:block flex items-center gap-1 mt-1">Directions:</div>
            <div className="text-[#575a7b] flex items-center gap-1 mt-1 justify-center sm:justify-start">
              <a href="#" className="text-[#575a7b] underline font-bold text-sm sm:text-sm">
                View Map
              </a>
              <span className="text-[#f78da7] ">
                <MapPin className="text-black" size={16} />
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-between items-between md:gap-4 gap-2 shrink-0 mr-4 mt-4 md:mt-0 ml-2">
            <div className="flex flex-col justify-center items-center text-right">
              <p className="text-[#575a7b] text-[0.81rem]">BUENOS AIRES, ARGENTINA</p>
              <p className="text-[#f78da7] bold text-xl leading-tight">
                17 — 22 <span className="text-[#575a7b] bold">Nov, 2024</span>
              </p>
            </div>
            <div className="ml-auto">
              <Button fat color="teal-1" className="flex items-center gap-3" onClick={handleAddToCalendar}>
                <Calendar size={17} className="translate-y-[-0.5px]" />
                Add to Calendar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AddToCalendarModal open={showCalendarModal} close={() => setShowCalendarModal(false)}>
        <div className="p-6 rounded-lg text-black flex flex-col justify-center items-center gap-4">
          <p className="">Add to calendar</p>

          <div className="flex flex-col gap-2 relative">
            <a {...calendarData.icsAttributes} className="w-full block">
              <Button color="teal-1" fill className="w-full">
                Download (.ics)
              </Button>
            </a>

            <Link href={calendarData.googleCalUrl}>
              <Button color="teal-1">Google Calendar</Button>
            </Link>
          </div>
        </div>
      </AddToCalendarModal>
    </section>
  )
}

// const Venue: React.FC = () => {
//   return (
//     <section className="py-6 max-w-[600px] font-sans border-b border-solid border-neutral-400">
//       <h1 className="section-header">VENUE</h1>

//       <div className="flex justify-between items-center py-4 border-solid border-t border-b border-neutral-400 bg-neutral-100 mt-4">
//         <div className="flex-none w-2/5 flex items-center">
//           {/* Logo */}
//           <Image src={LaRuralLogo} alt="La Rural" className="max-w-[400px] mr-2" />
//         </div>

//         <div className="flex-none w-2/5 mr-2">
//           {/* Venue image */}
//           <Image src={LaRuralVenue} alt="La Rural venue" className="w-full mr-2" />
//         </div>
//       </div>

//       <div className="py-8 pb-0 grid grid-cols-[150px_1fr] gap-1">
//         <div className="text-[#575a7b] font-semibold">Venue:</div>
//         <div className="text-[#575a7b]">La Rural</div>

//         <div className="text-[#575a7b] font-semibold">District:</div>
//         <div className="text-[#575a7b]">Palermo</div>

//         <div className="text-[#575a7b] font-semibold">Address:</div>
//         <div className="text-[#575a7b]">Av. Sarmiento 2704, C1425 Cdad. Autónoma de Buenos Aires</div>

//         <div className="col-span-2 mt-2 flex items-center gap-2">
//           <span className="text-[#f78da7] text-2xl">
//             <MapPin className="text-black" size={20} />
//           </span>
//           <a href="#" className="text-[#575a7b] underline font-bold">
//             Venue Direction
//           </a>
//         </div>
//       </div>

//       <div className="border-t border-gray-200 py-4">
//         <div className="flex items-center">
//           <div className="flex flex-col text-lg">
//             <p className="text-[#575a7b]">BUENOS AIRES, ARGENTINA —</p>
//             <p className="text-[#f78da7] bold">
//               17 — 22 <span className="text-[#575a7b] bold">Nov, 2024</span>
//             </p>
//           </div>

//           <div className="ml-auto">
//             <Button fat className="flex items-center gap-2  border border-[#6b9ad3] rounded-full px-6 py-3">
//               <Calendar size={20} />
//               Add to Calendar
//             </Button>
//           </div>
//         </div>
//       </div>
//     </section>
//   )
// }

export default Venue
